const {
	expect
} = require("chai");
const { BigNumber } = require("ethers");
const {
	ethers,
	web3
} = require("hardhat");
const {
	deployments
} = require("hardhat");
const {Accounts} = require('web3-eth-accounts');

describe("CoinFlip contract: ", function () {
	let coinFlip, accounts;
	before("Before: ", async function() {
		accounts = await ethers.getNamedSigners();
		await deployments.deploy("CoinFlip", {
			from: accounts.deployer.address,
			log: true,
            value: ethers.utils.parseEther("100")
		});

		coinFlip = await ethers.getContract("CoinFlip");
	});

	describe("Initialize: ", async () => {
		it("Should initialize with correct args: ", async () => {
			expect(await coinFlip.owner()).to.eq(accounts.deployer.address);
			expect(await coinFlip.croupie()).to.eq(accounts.caller.address);
		});
	});

    describe("Bet range: ", async () => {
        it("Should set the bet range correctly: ", async function() {
            await coinFlip.connect(accounts.deployer).setBetRange(ethers.utils.parseEther("2"), ethers.utils.parseEther("5"));
            expect(await coinFlip.minBet()).to.equal(ethers.utils.parseEther("2"));
            expect(await coinFlip.maxBet()).to.equal(ethers.utils.parseEther("5"));
        });
        
        it("Should be reverted with 'Coinflip: Only Owner'", async function() {
            await expect(coinFlip.connect(accounts.caller).setBetRange(ethers.utils.parseEther("2"), ethers.utils.parseEther("5"))).to.be.revertedWith("Coinflip: Only Owner"); 
        });
        
        it("Should be reverted with 'Error: Min and Max bets less than 0.'", async function() {
            await expect(coinFlip.connect(accounts.deployer).setBetRange(0, 0)).to.be.revertedWith("Error: Min and Max bets less than 0");
        });

        it("Should be reverted with 'Error: Min bet greater than Max bet.'", async function() {
            await expect(coinFlip.connect(accounts.deployer).setBetRange(ethers.utils.parseEther("5"), ethers.utils.parseEther("2"))).to.be.revertedWith("Error: Min bet greater than Max bet");
        });
    });

	describe("Play function: ", async () => {
		it("Should create game: ", async () => {
			const seed = ethers.utils.formatBytes32String("game1");
			const choice = ethers.BigNumber.from("1");
			await coinFlip.connect(accounts.caller).play(choice, seed, {value: ethers.utils.parseEther("2")});

			expect(await coinFlip.games(seed)).to.eql([
				BigNumber.from("1"),
				accounts.caller.address,
				Number(choice),
				ethers.utils.parseEther("2"),
				BigNumber.from("0"),
				BigNumber.from("0"),
				0
            ])
		});

		it("Should revert with message: ", async () => {
			const seed = ethers.utils.formatBytes32String("game2");
			const choice = ethers.BigNumber.from("1");
			await coinFlip.connect(accounts.caller).play(choice, seed, {value: ethers.utils.parseEther("2")});

			await expect(coinFlip.play(choice, seed))
			.to
			.be
			.revertedWith("CoinFlip: Only unique seed");
		});

        it("Should emit event: ", async () => {
            const choice = ethers.BigNumber.from("1");
            const seed = ethers.utils.formatBytes32String("game4");
            await expect(coinFlip.connect(accounts.caller).play(choice, seed, {value: ethers.utils.parseEther("2")})).to.emit(coinFlip, "GameCreated").
            withArgs(accounts.caller.address, ethers.utils.parseEther("2"), choice);
        })
	});


	describe("Confirm function: ", async () => {
		it("Should confirm game: ", async () => {
			const seed = ethers.utils.formatBytes32String("game3");
			await coinFlip.connect(accounts.caller).play(0, seed, {value: ethers.utils.parseEther("2")});
			const privateKey = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
			const signature = web3.eth.accounts.sign(seed, privateKey);
			const result = BigNumber.from(signature.s).mod(2);
            
            const prize = ethers.utils.parseEther("2") * coinFlip.coeff() / 100;
            const profit = coinFlip.profit();
            await coinFlip.connect(accounts.caller).confirm(seed, signature.v, signature.r, signature.s);

            console.log((await coinFlip.games(seed)).choice);
			if (result == (await coinFlip.games(seed)).choice) {
                expect((await coinFlip.games(seed)).status).to.equal(await coinFlip.status());
                expect((await coinFlip.games(seed)).result).to.equal(result);
                expect((await coinFlip.games(seed)).prize).to.equal(prize);
                expect(await coinFlip.profit()).to.equal(profit.sub(prize));
                // expect(transfer) ??
            }else {
                expect((await coinFlip.games(seed)).status).to.equal(await coinFlip.status());
                expect((await coinFlip.games(seed)).result).to.equal(result);
                expect(await coinFlip.profit()).to.equal(profit.add(prize));
            }
		});

        it("Should emit event: ", async () => {
            const seed = ethers.utils.formatBytes32String("game7");
			const privateKey = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
			const signature = web3.eth.accounts.sign(seed, privateKey);
			const result = BigNumber.from(signature.s).mod(2);
            
            const prize = ethers.utils.parseEther("2") * coinFlip.coeff() / 100;

            await expect(coinFlip.connect(accounts.caller).confirm(seed, signature.v, signature.r, signature.s)).to.emit(coinFlip, "GamePlayed").
            withArgs(accounts.caller.address, prize, await (coinFlip.games(seed)).choice, result, await coinFlip.status());
        });


	})


});