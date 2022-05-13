//SPDX-License-Identifier: Unlicense
import "hardhat/console.sol";
pragma solidity ^0.8.0;

contract CoinFlip {
    
    enum Status {PENDING, WON, LOST}
    Status public status = Status.PENDING;


    struct Game {
        address player;
        uint8 choice;
        uint256 betAmount;
        uint256 prize;
        uint256 result;
        Status status;
    }

    mapping(uint256 => Game) public games;
    
    uint256 public gamesCount;
    uint256 public minBet = 0.01 ether;
    uint256 public maxBet = 10 ether;
    uint256 public coeff = 195;
    uint256 public profit;
    address public owner;

    constructor() payable {
        owner = msg.sender;
    }

    modifier onlyOwner {
        require(msg.sender == owner, "Coinflip: Only Owner");
        _;
    }

    function setBetRange(uint256 _minBet, uint256 _maxBet) external onlyOwner {
        require(_maxBet > 0 && _minBet > 0, "Error: Min and Max bets less than 0.");
        require(_maxBet > _minBet, "Error: Min bet greater than Max bet.");
        minBet = _minBet;
        maxBet = _maxBet;
    }

    function setCoeff(uint256 _coeff) external onlyOwner {
        require(_coeff > 100, "Error: Coeff less than 100.");
        coeff = _coeff;
    }

    function createGame(uint8 _choice) external payable {
        require(msg.value >= minBet && msg.value <= maxBet, "Error: Bet not in range.");
        require(_choice == 0 || _choice == 1, "Error: Nonexistent Choice.");


        games[gamesCount] = Game(
            msg.sender,
            _choice,
            msg.value,
            0,
            0,
            Status.PENDING
        );
        gamesCount += 1;
    }

    function play(uint256 _id) external {
        Game storage game = games[_id];

        uint256 _result = block.timestamp % 2;
        console.log(_result);
        console.log(block.timestamp);
        game.result = _result;


        if (game.choice == game.result) {
            uint256 _prize = game.betAmount * coeff / 100;
            game.prize = _prize;
            game.status = Status.WON;
            status = Status.WON;

            payable(game.player).transfer(_prize);
        } else {
            game.status = Status.LOST;
            status = Status.LOST;

            profit += game.betAmount;
        }
    }

    function withdraw(uint256 _amount) external onlyOwner {
        require(address(this).balance >= _amount, "Error: Not enough balance.");
        profit -= _amount;
        payable(msg.sender).transfer(_amount);
    }




}