import chai, { expect } from 'chai'
import { Contract, constants } from 'ethers'
import { solidity, MockProvider, createFixtureLoader, deployContract } from 'ethereum-waffle'

import VexchangeV2Factory from '../VexchangeV2/VexchangeV2Factory.json'
import VexchangeV2Pair from '../VexchangeV2/VexchangeV2Pair.json'
import FeeToSetter from '../../build/FeeToSetter.json'
import FeeTo from '../../build/FeeTo.json'
import Vex from '../../build/VEX.json'

import { governanceFixture } from '../fixtures'
import { mineBlock, expandTo18Decimals } from '../utils'

chai.use(solidity)

describe('scenario:FeeTo', () => {
  const provider = new MockProvider({
    ganacheOptions: {
      hardfork: 'istanbul',
      mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
      gasLimit: 99999999,
    },
  })
  const [wallet, other] = provider.getWallets()
  const loadFixture = createFixtureLoader([wallet], provider)

  beforeEach(async () => {
    await loadFixture(governanceFixture)
  })

  let factory: Contract
  beforeEach('deploy vexchange v2', async () => {
    factory = await deployContract(wallet, VexchangeV2Factory, [30, 1667, wallet.address, wallet.address], {
      gasLimit: 99999999,
    })
  })

  let feeToSetter: Contract
  let vestingEnd: number
  let feeTo: Contract
  beforeEach('deploy feeToSetter vesting contract', async () => {
    // deploy feeTo
    // constructor arg should be timelock, just mocking for testing purposes
    feeTo = await deployContract(wallet, FeeTo, [wallet.address])

    const { timestamp: now } = await provider.getBlock('latest')
    vestingEnd = now + 60
    // 3rd constructor arg should be timelock, just mocking for testing purposes
    // 4th constructor arg should be feeTo, just mocking for testing purposes
    feeToSetter = await deployContract(wallet, FeeToSetter, [
      factory.address,
      vestingEnd,
      wallet.address,
      feeTo.address,
    ])

    // Note: This is modified to use the transferOwnership function
    // of the Ownable class, instead of the setFeeToSetter of the
    // original uniswap contract because we moved the function
    // of setting the platformFeeTo to the owner instead
    await factory.transferOwnership(feeToSetter.address)
    await mineBlock(provider, vestingEnd)
    await feeToSetter.setPlatformFeeTo()
  })

  it('permissions', async () => {
    await expect(feeTo.connect(other).setOwner(other.address)).to.be.revertedWith('FeeTo::setOwner: not allowed')

    await expect(feeTo.connect(other).setFeeRecipient(other.address)).to.be.revertedWith(
      'FeeTo::setFeeRecipient: not allowed'
    )
  })

  describe('tokens', () => {
    const tokens: Contract[] = []
    beforeEach('make test tokens', async () => {
      const { timestamp: now } = await provider.getBlock('latest')
      const token0 = await deployContract(wallet, Vex, [wallet.address, constants.AddressZero])
      tokens.push(token0)
      const token1 = await deployContract(wallet, Vex, [wallet.address, constants.AddressZero])
      tokens.push(token1)
    })

    let pair: Contract
    beforeEach('create fee liquidity', async () => {
      // turn the fee on
      await feeToSetter.setDefaultPlatformFee(1667)

      // create the pair
      await factory.createPair(tokens[0].address, tokens[1].address)
      const pairAddress = await factory.getPair(tokens[0].address, tokens[1].address)
      pair = new Contract(pairAddress, VexchangeV2Pair.abi).connect(wallet)

      // add liquidity
      await tokens[0].transfer(pair.address, expandTo18Decimals(1))
      await tokens[1].transfer(pair.address, expandTo18Decimals(1))
      await pair.mint(wallet.address)

      // swap
      await tokens[0].transfer(pair.address, expandTo18Decimals(1).div(10))
      const amounts =
        tokens[0].address.toLowerCase() < tokens[1].address.toLowerCase()
          ? [0, expandTo18Decimals(1).div(20)]
          : [expandTo18Decimals(1).div(20), 0]
      await pair.swap(...amounts, wallet.address, '0x', { gasLimit: 9999999 })

      // mint again to collect the rewards
      await tokens[0].transfer(pair.address, expandTo18Decimals(1))
      await tokens[1].transfer(pair.address, expandTo18Decimals(1))
      await pair.mint(wallet.address, { gasLimit: 9999999 })
    })

    it('updateTokenAllowState', async () => {
      await feeTo.updateTokenAllowState(tokens[0].address, true)
      let tokenAllowState = await feeTo.tokenAllowStates(tokens[0].address)
      expect(tokenAllowState[0]).to.be.true
      expect(tokenAllowState[1]).to.be.eq(1)

      await feeTo.updateTokenAllowState(tokens[0].address, false)
      tokenAllowState = await feeTo.tokenAllowStates(tokens[0].address)
      expect(tokenAllowState[0]).to.be.false
      expect(tokenAllowState[1]).to.be.eq(2)

      await feeTo.updateTokenAllowState(tokens[0].address, false)
      tokenAllowState = await feeTo.tokenAllowStates(tokens[0].address)
      expect(tokenAllowState[0]).to.be.false
      expect(tokenAllowState[1]).to.be.eq(2)

      await feeTo.updateTokenAllowState(tokens[0].address, true)
      tokenAllowState = await feeTo.tokenAllowStates(tokens[0].address)
      expect(tokenAllowState[0]).to.be.true
      expect(tokenAllowState[1]).to.be.eq(2)

      await feeTo.updateTokenAllowState(tokens[0].address, false)
      tokenAllowState = await feeTo.tokenAllowStates(tokens[0].address)
      expect(tokenAllowState[0]).to.be.false
      expect(tokenAllowState[1]).to.be.eq(3)
    })

    it('claim is a no-op if renounce has not been called', async () => {
      await feeTo.updateTokenAllowState(tokens[0].address, true)
      await feeTo.updateTokenAllowState(tokens[1].address, true)
      await feeTo.setFeeRecipient(other.address)

      const balanceBefore = await pair.balanceOf(other.address)
      expect(balanceBefore).to.be.eq(0)
      await feeTo.claim(pair.address)
      const balanceAfter = await pair.balanceOf(other.address)
      expect(balanceAfter).to.be.eq(0)
    })

    it('renounce works', async () => {
      await feeTo.updateTokenAllowState(tokens[0].address, true)
      await feeTo.updateTokenAllowState(tokens[1].address, true)
      await feeTo.setFeeRecipient(other.address)

      const totalSupplyBefore = await pair.totalSupply()
      await feeTo.renounce(pair.address, { gasLimit: 9999999 })
      const totalSupplyAfter = await pair.totalSupply()
      expect(totalSupplyAfter.lt(totalSupplyBefore)).to.be.true
    })

    it('claim works', async () => {
      await feeTo.updateTokenAllowState(tokens[0].address, true)
      await feeTo.updateTokenAllowState(tokens[1].address, true)
      await feeTo.setFeeRecipient(other.address)

      await feeTo.renounce(pair.address, { gasLimit: 9999999 })

      // swap
      await tokens[0].transfer(pair.address, expandTo18Decimals(1).div(10))
      const amounts =
        tokens[0].address.toLowerCase() < tokens[1].address.toLowerCase()
          ? [0, expandTo18Decimals(1).div(1000)]
          : [expandTo18Decimals(1).div(1000), 0]
      await pair.swap(...amounts, wallet.address, '0x', { gasLimit: 9999999 })

      // mint again to collect the rewards
      await tokens[0].transfer(pair.address, expandTo18Decimals(1))
      await tokens[1].transfer(pair.address, expandTo18Decimals(1))
      await pair.mint(wallet.address, { gasLimit: 9999999 })

      const balanceBefore = await pair.balanceOf(other.address)
      await feeTo.claim(pair.address, { gasLimit: 9999999 })
      const balanceAfter = await pair.balanceOf(other.address)
      expect(balanceAfter.gt(balanceBefore)).to.be.true
    })
  })
})
