import chai, { expect } from 'chai'
import { Contract, constants } from 'ethers'
import { solidity, MockProvider, createFixtureLoader, deployContract } from 'ethereum-waffle'

import VexchangeV2Factory from '../VexchangeV2/VexchangeV2Factory.json'
import FeeToSetter from '../../build/FeeToSetter.json'

import { governanceFixture } from '../fixtures'
import { mineBlock } from '../utils'

chai.use(solidity)

describe('scenario:FeeToSetter', () => {
  const provider = new MockProvider({
    ganacheOptions: {
      hardfork: 'istanbul',
      mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
      gasLimit: 9999999,
    },
  })
  const [wallet, other] = provider.getWallets()
  const loadFixture = createFixtureLoader([wallet], provider)

  beforeEach(async () => {
    await loadFixture(governanceFixture)
  })

  let factory: Contract
  beforeEach('deploy vexchange v2', async () => {
    factory = await deployContract(wallet, VexchangeV2Factory, [30, 1667, wallet.address, wallet.address])
  })

  let feeToSetter: Contract
  let vestingEnd: number
  beforeEach('deploy feeToSetter vesting contract', async () => {
    const { timestamp: now } = await provider.getBlock('latest')
    vestingEnd = now + 60
    // 3rd constructor arg should be timelock, just mocking for testing purposes
    // 4th constructor arg should be feeTo, just mocking for testing purposes
    feeToSetter = await deployContract(wallet, FeeToSetter, [
      factory.address,
      vestingEnd,
      wallet.address,
      other.address,
    ])

    // set feeToSetter to be the vesting contract
    await factory.transferOwnership(feeToSetter.address)
  })

  it('setOwner:fail', async () => {
    await expect(feeToSetter.connect(other).setOwner(other.address)).to.be.revertedWith(
      'FeeToSetter::setOwner: not allowed'
    )
  })

  it('setOwner', async () => {
    await feeToSetter.setOwner(other.address)
  })

  it('setFactoryOwner:fail', async () => {
    await expect(feeToSetter.setFactoryOwner(other.address)).to.be.revertedWith(
      'FeeToSetter::setFactoryOwner: not time yet'
    )
    await mineBlock(provider, vestingEnd)
    await expect(feeToSetter.connect(other).setFactoryOwner(other.address)).to.be.revertedWith(
      'FeeToSetter::setFactoryOwner: not allowed'
    )
  })

  it('setFactoryOwner', async () => {
    await mineBlock(provider, vestingEnd)
    await feeToSetter.setFactoryOwner(other.address)
  })

  it('setDefaultPlatformFee:fail', async () => {
    await expect(feeToSetter.setDefaultPlatformFee(30)).to.be.revertedWith('FeeToSetter::setDefaultPlatformFee: not time yet')
    await mineBlock(provider, vestingEnd)
    await expect(feeToSetter.connect(other).setDefaultPlatformFee(30)).to.be.revertedWith('FeeToSetter::setDefaultPlatformFee: not allowed')
  })

  it('setDefaultPlatformFee', async () => {
    await mineBlock(provider, vestingEnd)

    await feeToSetter.setDefaultPlatformFee(30)
    const platformFee = await factory.defaultPlatformFee()
    expect(platformFee).to.be.eq(30)
  })
})
