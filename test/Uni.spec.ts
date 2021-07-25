import chai, { expect } from 'chai'
import { BigNumber, Contract, constants, utils } from 'ethers'
import { solidity, MockProvider, createFixtureLoader, deployContract } from 'ethereum-waffle'
import { ecsign } from 'ethereumjs-util'

import { governanceFixture } from './fixtures'
import { expandTo18Decimals, mineBlock } from './utils'

import Uni from '../build/Uni.json'

chai.use(solidity)

const DOMAIN_TYPEHASH = utils.keccak256(
  utils.toUtf8Bytes('EIP712Domain(string name,uint256 chainId,address verifyingContract)')
)

const PERMIT_TYPEHASH = utils.keccak256(
  utils.toUtf8Bytes('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)')
)

describe('Uni', () => {
  const provider = new MockProvider({
    ganacheOptions: {
      hardfork: 'istanbul',
      mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
      gasLimit: 9999999,
    },
  })
  const [wallet, other0, other1] = provider.getWallets()
  const loadFixture = createFixtureLoader([wallet], provider)

  let uni: Contract
  beforeEach(async () => {
    const fixture = await loadFixture(governanceFixture)
    uni = fixture.uni
  })

  it('permit', async () => {
    const domainSeparator = utils.keccak256(
      utils.defaultAbiCoder.encode(
        ['bytes32', 'bytes32', 'uint256', 'address'],
        [DOMAIN_TYPEHASH, utils.keccak256(utils.toUtf8Bytes('Uniswap')), 1, uni.address]
      )
    )

    const owner = wallet.address
    const spender = other0.address
    const value = 123
    const nonce = await uni.nonces(wallet.address)
    const deadline = constants.MaxUint256
    const digest = utils.keccak256(
      utils.solidityPack(
        ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
        [
          '0x19',
          '0x01',
          domainSeparator,
          utils.keccak256(
            utils.defaultAbiCoder.encode(
              ['bytes32', 'address', 'address', 'uint256', 'uint256', 'uint256'],
              [PERMIT_TYPEHASH, owner, spender, value, nonce, deadline]
            )
          ),
        ]
      )
    )

    const { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(wallet.privateKey.slice(2), 'hex'))

    await uni.permit(owner, spender, value, deadline, v, utils.hexlify(r), utils.hexlify(s))
    expect(await uni.allowance(owner, spender)).to.eq(value)
    expect(await uni.nonces(owner)).to.eq(1)

    await uni.connect(other0).transferFrom(owner, spender, value)
  })

  it('nested delegation', async () => {
    await uni.transfer(other0.address, expandTo18Decimals(1))
    await uni.transfer(other1.address, expandTo18Decimals(2))

    let currectVotes0 = await uni.getCurrentVotes(other0.address)
    let currectVotes1 = await uni.getCurrentVotes(other1.address)
    expect(currectVotes0).to.be.eq(0)
    expect(currectVotes1).to.be.eq(0)

    await uni.connect(other0).delegate(other1.address)
    currectVotes1 = await uni.getCurrentVotes(other1.address)
    expect(currectVotes1).to.be.eq(expandTo18Decimals(1))

    await uni.connect(other1).delegate(other1.address)
    currectVotes1 = await uni.getCurrentVotes(other1.address)
    expect(currectVotes1).to.be.eq(expandTo18Decimals(1).add(expandTo18Decimals(2)))

    await uni.connect(other1).delegate(wallet.address)
    currectVotes1 = await uni.getCurrentVotes(other1.address)
    expect(currectVotes1).to.be.eq(expandTo18Decimals(1))
  })

  it('mints', async () => {
    const { timestamp: now } = await provider.getBlock('latest')
    const uni = await deployContract(wallet, Uni, [wallet.address, wallet.address])
    const supply = await uni.totalSupply()

    await expect(uni.connect(other1).mint(other1.address, 1)).to.be.revertedWith('Uni::mint: only the minter can mint')
    await expect(uni.mint('0x0000000000000000000000000000000000000000', 1)).to.be.revertedWith('Uni::mint: cannot transfer to the zero address')

    // Can mint a given amount
    const amount = supply.mul(3).div(100)
    await uni.mint(wallet.address, amount)
    expect(await uni.balanceOf(wallet.address)).to.be.eq(supply.add(amount))
  })

  it('burn', async () => {
    const uni = await deployContract(wallet, Uni, [wallet.address, wallet.address])
    let supply = await uni.totalSupply();
    
    // Cannot burn more than uint96 limit 
    await expect(uni.burn("79228162514264337593543950337")).to.be.revertedWith("Vexchange::burn amount exceeds 96 bits");

    // Cannot burn more than what the wallet owns
    await expect(uni.burn(supply + 1)).to.be.revertedWith("Vexchange::burn new balance underflows");

    // Can burn a given amount 
    const amountToBurn = expandTo18Decimals(1000);
    await uni.burn(amountToBurn);
    expect(await uni.balanceOf(wallet.address)).to.eq(supply.sub(amountToBurn));
    expect(await uni.totalSupply()).to.eq(supply.sub(amountToBurn));

    supply = await uni.totalSupply();

    // Burn 0 tokens
    const zeroAmount = 0;
    await uni.burn(zeroAmount);
    expect(await uni.balanceOf(wallet.address)).to.eq(supply);
    expect(await uni.totalSupply()).to.eq(supply);
  });
})
