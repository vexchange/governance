import chai, { expect } from 'chai'
import { Contract, constants } from 'ethers'
import { solidity, MockProvider, createFixtureLoader } from 'ethereum-waffle'

import { governanceFixture } from './fixtures'
import { DELAY } from './utils'

chai.use(solidity)

describe('GovernorAlpha', () => {
  const provider = new MockProvider({
    ganacheOptions: {
      hardfork: 'istanbul',
      mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
      gasLimit: 9999999,
    },
  })
  const [wallet] = provider.getWallets()
  const loadFixture = createFixtureLoader([wallet], provider)

  let vex: Contract
  let timelock: Contract
  let governorAlpha: Contract
  beforeEach(async () => {
    const fixture = await loadFixture(governanceFixture)
    vex = fixture.vex
    timelock = fixture.timelock
    governorAlpha = fixture.governorAlpha
  })

  it('vex', async () => {
    const balance = await vex.balanceOf(wallet.address)
    const totalSupply = await vex.totalSupply()
    expect(balance).to.be.eq(totalSupply)
  })

  it('timelock', async () => {
    const admin = await timelock.admin()
    expect(admin).to.be.eq(governorAlpha.address)
    const pendingAdmin = await timelock.pendingAdmin()
    expect(pendingAdmin).to.be.eq(constants.AddressZero)
    const delay = await timelock.delay()
    expect(delay).to.be.eq(DELAY)
  })

  it('governor', async () => {
    const votingPeriod = await governorAlpha.votingPeriod()
    expect(votingPeriod).to.be.eq(60480)
    const timelockAddress = await governorAlpha.timelock()
    expect(timelockAddress).to.be.eq(timelock.address)
    const vexFromGovernor = await governorAlpha.vex()
    expect(vexFromGovernor).to.be.eq(vex.address)
  })
})
