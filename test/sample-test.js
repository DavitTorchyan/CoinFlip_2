const { expect } = require("chai");
const {
  ethers: {
    getContractFactory,
    BigNumber,
  }, ethers
} = require("hardhat");

describe("CoinFlip", function () {

  let accounts;
  let deployer, owner, caller;
  let coinflip;

  beforeEach(async function() {
    accounts = await ethers.getSigners();
    ([deployer, owner, caller ] = accounts);
    const CoinFlip = await getContractFactory("CoinFlip");
    coinflip = await CoinFlip.deploy({value: ethers.utils.parseUnits("10")});
    await coinflip.deployed();    

  });

  it("Should set the bet range correctly: ", async function() {
    await coinflip.connect(deployer).setBetRange(2, 5);
    expect(await coinflip.minBet()).to.equal(2);
    expect(await coinflip.maxBet()).to.equal(5);
  })

  it("Should be reverted with 'Coinflip: Only Owner'", async function() {
    await expect(coinflip.connect(caller).setBetRange(2, 5)).to.be.revertedWith("Coinflip: Only Owner"); 
  })

  it("Should be reverted with 'Error: Min and Max bets less than 0.'", async function() {
    await expect(coinflip.connect(deployer).setBetRange(0, 0)).to.be.revertedWith("Error: Min and Max bets less than 0.");
  })

  it("Should be reverted with 'Error: Min bet greater than Max bet.'", async function() {
    await expect(coinflip.connect(deployer).setBetRange(5, 2)).to.be.revertedWith("Error: Min bet greater than Max bet.");
  })

  it("Should set correct coeff: ", async function() {
    await coinflip.connect(deployer).setCoeff(110);
    expect(await coinflip.coeff()).to.equal(110);
  })

  it("Should be reverted with 'Coinflip: Only Owner'", async function() {
    await expect(coinflip.connect(caller).setCoeff(150)).to.be.revertedWith("Coinflip: Only Owner"); 
  })

  it("Should be reverted with 'Error: Coeff less than 100.'", async function() {
    await expect(coinflip.connect(deployer).setCoeff(50)).to.be.revertedWith("Error: Coeff less than 100.");
  })

  it("Should create game correctly: ", async function() {
    await coinflip.connect(deployer).setBetRange(ethers.utils.parseUnits("1"), ethers.utils.parseUnits("8"));
    await coinflip.connect(caller).createGame(0, {from: caller.address, value: ethers.utils.parseUnits("3")});
    const expected = [caller.address, 0, ethers.utils.parseUnits("3"), BigNumber.from(0), BigNumber.from(0), 0];
    expect(await coinflip.games(0)).to.eql(expected);
  })

  it("Should be reverted with 'Error: Bet not in range.'", async function() {
    await coinflip.connect(deployer).setBetRange(ethers.utils.parseUnits("1"), ethers.utils.parseUnits("8"));
    await expect(coinflip.connect(caller).createGame(0, {from: caller.address, value: ethers.utils.parseUnits("10")})).to.be.revertedWith("Error: Bet not in range.");
  })

  it("Should be reverted with 'Error: Nonexistent Choice.'", async function() {
    await expect(coinflip.connect(caller).createGame(2, {from: caller.address, value: ethers.utils.parseUnits("5")})).to.be.revertedWith("Error: Nonexistent Choice.");
  })

  it("Should play correctly: ", async function () {
    await coinflip.connect(caller).createGame(0, {from: caller.address, value: ethers.utils.parseUnits("3")});
    const playerBalance = await ethers.provider.getBalance(caller.address);
    const play = await coinflip.play(0);
    const result = (await ethers.provider.getBlock(play.blockNumber)).timestamp;
    const prize = ((await coinflip.games(0)).betAmount).mul(await coinflip.coeff()).div(BigNumber.from(100));
    if (result % 2 == (await coinflip.games(0)).choice) {
      expect((await coinflip.games(0)).status).to.equal(await coinflip.status());
      expect(await ethers.provider.getBalance(caller.address)).to.equal(playerBalance.add(prize));
    }else {
      expect((await coinflip.games(0)).status).to.equal(await coinflip.status());
      expect(await coinflip.profit()).to.equal(ethers.utils.parseUnits("3"));
    }
  }) 
  
  it("Should be reverted with 'Error: Not enough balance.'", async function() {
    await expect(coinflip.connect(deployer).withdraw(ethers.utils.parseUnits("11"))).to.be.revertedWith("Error: Not enough balance.");
  })

  it("Should withdraw correctly: ", async function() {
    await coinflip.connect(caller).createGame(0, {from: caller.address, value: ethers.utils.parseUnits("3")});
    const play = await coinflip.play(0);
    const result = (await ethers.provider.getBlock(play.blockNumber)).timestamp;
    const balance = await ethers.provider.getBalance(deployer.address);
    if (result % 2 !== (await coinflip.games(0)).choice) {
      profit = await coinflip.profit();
      const tx = await coinflip.connect(deployer).withdraw(ethers.utils.parseUnits("1"));
      const fee = (await tx.wait()).gasUsed * tx.gasPrice;
      expect(await coinflip.profit()).to.equal(profit.sub(ethers.utils.parseUnits("1")));
      expect(await ethers.provider.getBalance(deployer.address)).to.equal(balance.add(ethers.utils.parseUnits("1")).sub(fee));
    }
  })

  it("Should be reverted with 'Coinflip: Only Owner'", async function() {
    await expect(coinflip.connect(caller).withdraw(1)).to.be.revertedWith("Coinflip: Only Owner"); 
  })

});