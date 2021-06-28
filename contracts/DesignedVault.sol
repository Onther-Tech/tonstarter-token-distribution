//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

//import "hardhat/console.sol";

contract DesignedVault is Ownable {
    using SafeERC20 for IERC20;

    struct ClaimedInfo {
        bool joined;
        uint256 claimedTime;
    }
    struct TgeInfo {
        bool allocated;
        bool started;
        uint256 allocatedAmount;
        uint256 claimedCount;
        uint256 amount;
        address[] whitelist;
        mapping(address => ClaimedInfo) claimedTime;
    }
    uint256 public maxInputOnceTime;
    ///
    string public name;
    ///
    address public token;
    address public claimer;

    uint256 public totalAllocatedAmount;
    uint256 public totalClaimedAmount;
    uint256 public totalClaims;
    uint256 public lastClaimedRound;

    uint256 public startTime;
    uint256 public endTime;
    uint256 public periodTimesPerCliam;

    uint256 public totalTgeCount;
    uint256 public totalTgeAmount;

    /// round => TgeInfo
    mapping(uint256 => TgeInfo) public tgeInfos;

    // for claimer
    uint256 public oneClaimAmountByClaimer;
    uint256 public totalClaimedCountByClaimer;

    // round = time
    mapping(uint256 => uint256) public claimedTimesOfRoundByCliamer;
    bool public startedByClaimer;

    modifier nonZeroAddress(address _addr) {
        require(_addr != address(0), "DesignateVault: zero address");
        _;
    }

    modifier nonZero(uint256 _value) {
        require(_value > 0, "DesignateVault: zero value");
        _;
    }

    /// @dev event on set claimer
    /// @param newClaimer new claimer address
    event SetNewClaimer(address newClaimer);

    /// @dev event on allocate amount
    ///@param round  it is the period unit can claim once
    ///@param amount total claimable amount
    event AllocatedAmount(uint256 round, uint256 amount);

    /// @dev event on add whitelist
    ///@param round  it is the period unit can claim once
    ///@param users people who can claim in that round
    event AddedWhitelist(uint256 round, address[] users);

    /// @dev event on start round
    ///@param round  it is the period unit can claim once
    event StartedRound(uint256 round);

    /// @dev event on start
    event Started();

    /// @dev event on claim
    ///@param caller  claimer
    ///@param amount  the claimed amount of caller
    ///@param totalClaimedAmount  total claimed amount
    event Claimed(
        address indexed caller,
        uint256 amount,
        uint256 totalClaimedAmount
    );

    /// @dev event on withdraw
    ///@param caller  owner
    ///@param amount  the withdrawable amount of owner
    event Withdrawal(address indexed caller, uint256 amount);

    ///@dev constructor
    ///@param _name Vault's name
    ///@param _token Allocated token address
    constructor(
        string memory _name,
        address _token,
        uint256 _inputMaxOnce
    ) {
        name = _name;
        token = _token;
        claimer = msg.sender;
        maxInputOnceTime = _inputMaxOnce;
    }

    ///@dev initialization function
    ///@param _totalAllocatedAmount total allocated amount
    ///@param _totalClaims total available claim count
    ///@param _totalTgeCount   total tge count
    ///@param _startTime start time
    ///@param _periodTimesPerCliam period time per claim
    function initialize(
        uint256 _totalAllocatedAmount,
        uint256 _totalClaims,
        uint256 _totalTgeCount,
        uint256 _startTime,
        uint256 _periodTimesPerCliam
    )
        external
        onlyOwner
        nonZero(_totalAllocatedAmount)
        nonZero(_totalClaims)
        nonZero(_startTime)
        nonZero(_periodTimesPerCliam)
    {
        require(
            IERC20(token).balanceOf(address(this)) >= _totalAllocatedAmount,
            "DesignateVault: balanceOf is insuffient"
        );

        require(
            totalAllocatedAmount == 0,
            "DesignateVault: already initialized"
        );
        totalAllocatedAmount = _totalAllocatedAmount;
        totalClaims = _totalClaims;
        totalTgeCount = _totalTgeCount;
        startTime = _startTime;
        periodTimesPerCliam = _periodTimesPerCliam;
        endTime = _startTime + (_periodTimesPerCliam * _totalClaims);
    }

    ///@dev set claimer
    ///@param _newClaimer new claimer
    function setClaimer(address _newClaimer)
        external
        onlyOwner
        nonZeroAddress(_newClaimer)
    {
        require(claimer != _newClaimer, "DesignateVault: same address");
        claimer = _newClaimer;

        emit SetNewClaimer(_newClaimer);
    }

    ///@dev allocate amount for each round
    ///@param round  it is the period unit can claim once
    ///@param amount total claimable amount
    function allocateAmount(uint256 round, uint256 amount)
        external
        onlyOwner
        nonZero(round)
        nonZero(amount)
    {
        require(
            round <= totalTgeCount,
            "DesignateVault: exceed available round"
        );
        require(
            totalTgeAmount + amount <= totalAllocatedAmount,
            "DesignateVault: exceed total allocated amount"
        );

        TgeInfo storage tgeinfo = tgeInfos[round];
        require(!tgeinfo.allocated, "DesignateVault: already allocated");
        tgeinfo.allocated = true;
        tgeinfo.allocatedAmount = amount;
        totalTgeAmount += amount;

        emit AllocatedAmount(round, amount);
    }

    ///@dev Register the white list for the round.
    ///@param round  it is the period unit can claim once
    ///@param users people who can claim in that round
    function addWhitelist(uint256 round, address[] calldata users)
        external
        onlyOwner
        nonZero(round)
    {
        require(
            round <= totalTgeCount,
            "DesignateVault: exceed available round"
        );
        require(
            users.length > 0 && users.length <= maxInputOnceTime,
            "DesignateVault: check user's count"
        );
        TgeInfo storage tgeinfo = tgeInfos[round];
        require(!tgeinfo.started, "DesignateVault: already started");

        for (uint256 i = 0; i < users.length; i++) {
            if (
                users[i] != address(0) && !tgeinfo.claimedTime[users[i]].joined
            ) {
                tgeinfo.claimedTime[users[i]].joined = true;
                tgeinfo.whitelist.push(users[i]);
            }
        }

        emit AddedWhitelist(round, users);
    }

    ///@dev start round, Calculate how much the whitelisted people in the round can claim.
    ///@param round  it is the period unit can claim once
    function startRound(uint256 round)
        external
        onlyOwner
        nonZero(round)
        nonZero(totalClaims)
    {
        require(
            round <= totalTgeCount,
            "DesignateVault: exceed available round"
        );

        TgeInfo storage tgeinfo = tgeInfos[round];
        require(tgeinfo.allocated, "DesignateVault: no allocated");
        require(!tgeinfo.started, "DesignateVault: already started");
        tgeinfo.started = true;
        if (tgeinfo.allocatedAmount > 0 && tgeinfo.whitelist.length > 0)
            tgeinfo.amount = tgeinfo.allocatedAmount / tgeinfo.whitelist.length;
        else tgeinfo.amount = tgeinfo.allocatedAmount;

        emit StartedRound(round);
    }

    ///@dev start round for claimer , The amount charged at one time is determined.
    function start() external onlyOwner nonZero(totalClaims) {
        require(
            !startedByClaimer,
            "DesignateVault: already started by claimer"
        );
        for (uint256 i = 1; i <= totalTgeCount; i++) {
            require(
                tgeInfos[i].allocated,
                "DesignateVault: previous round did't be allocated yet."
            );
        }
        startedByClaimer = true;
        oneClaimAmountByClaimer =
            (totalAllocatedAmount - totalTgeAmount) /
            (totalClaims - totalTgeCount);

        emit Started();
    }

    ///@dev next claimable start time
    function nextClaimStartTime() external view returns (uint256 nextTime) {
        nextTime = startTime + (periodTimesPerCliam * lastClaimedRound);
        if (endTime < nextTime) nextTime = 0;
    }

    ///@dev next claimable round
    function nextClaimRound() external view returns (uint256 nextRound) {
        nextRound = lastClaimedRound + 1;
        if (totalClaims < nextRound) nextRound = 0;
    }

    function currentRound() public view returns (uint256 round) {
        if (block.timestamp < startTime) {
            round = 0;
        } else {
            round = (block.timestamp - startTime) / periodTimesPerCliam;
            round++;
        }
    }

    ///@dev number of unclaimed
    function unclaimedInfos()
        external
        view
        returns (uint256 count, uint256 amount)
    {
        count = 0;
        amount = 0;
        if (block.timestamp > startTime) {
            uint256 curRound = currentRound();
            if (msg.sender == claimer) {
                if (curRound > totalTgeCount) {
                    if (lastClaimedRound >= totalTgeCount) {
                        count = curRound - lastClaimedRound;
                    } else {
                        count = curRound - totalTgeCount;
                    }
                }
                if (count > 0) amount = count * oneClaimAmountByClaimer;
            } else {
                for (uint256 i = 1; i <= totalTgeCount; i++) {
                    if (curRound >= i) {
                        TgeInfo storage tgeinfo = tgeInfos[i];
                        if (tgeinfo.started) {
                            if (
                                tgeinfo.claimedTime[msg.sender].joined &&
                                tgeinfo.claimedTime[msg.sender].claimedTime == 0
                            ) {
                                count++;
                                amount += tgeinfo.amount;
                            }
                        }
                    }
                }
            }
        }
    }

    ///@dev claim
    function claim() external {
        uint256 count = 0;
        uint256 amount = 0;
        require(block.timestamp > startTime, "DesignateVault: not started yet");

        uint256 curRound = currentRound();
        if (msg.sender == claimer) {
            if (lastClaimedRound > totalTgeCount) {
                if (lastClaimedRound < curRound) {
                    count = curRound - lastClaimedRound;
                }
            } else {
                if (totalTgeCount < curRound) {
                    count = curRound - totalTgeCount;
                }
            }

            amount = count * oneClaimAmountByClaimer;
            require(amount > 0, "DesignateVault: no claimable amount");
            lastClaimedRound = curRound;
            totalClaimedAmount += amount;
            totalClaimedCountByClaimer++;
            claimedTimesOfRoundByCliamer[curRound] = block.timestamp;
            require(
                IERC20(token).transfer(msg.sender, amount),
                "DesignateVault: transfer fail"
            );
        } else {
            for (uint256 i = 1; i <= totalTgeCount; i++) {
                if (curRound >= i) {
                    TgeInfo storage tgeinfo = tgeInfos[i];
                    if (tgeinfo.started) {
                        if (
                            tgeinfo.claimedTime[msg.sender].joined &&
                            tgeinfo.claimedTime[msg.sender].claimedTime == 0
                        ) {
                            tgeinfo.claimedTime[msg.sender].claimedTime = block
                            .timestamp;
                            tgeinfo.claimedCount++;
                            amount += tgeinfo.amount;
                            count++;
                        }
                    }
                }
            }

            require(amount > 0, "DesignateVault: no claimable amount");
            totalClaimedAmount += amount;
            if (lastClaimedRound < totalTgeCount && curRound < totalTgeCount)
                lastClaimedRound = curRound;
            require(
                IERC20(token).transfer(msg.sender, amount),
                "DesignateVault: transfer fail"
            );
        }

        emit Claimed(msg.sender, amount, totalClaimedAmount);
    }

    ///@dev Amount that can be withdrawn by the owner
    function availableWithdrawAmount() public view returns (uint256 amount) {
        uint256 balance = IERC20(token).balanceOf(address(this));
        uint256 remainSendAmount = totalAllocatedAmount - totalClaimedAmount;
        require(balance >= remainSendAmount, "DesignateVault: insufficent");
        amount = balance - remainSendAmount;
    }

    ///@dev withdraw to whom
    ///@param to to address to send
    function withdraw(address to) external onlyOwner nonZeroAddress(to) {
        uint256 amount = availableWithdrawAmount();
        require(amount > 0, "DesignateVault: no withdrawable amount");
        require(
            IERC20(token).transfer(to, availableWithdrawAmount()),
            "DesignateVault: transfer fail"
        );

        emit Withdrawal(msg.sender, amount);
    }

    ///@dev get Tge infos
    ///@param round  it is the period unit can claim once
    function getTgeInfos(uint256 round)
        external
        view
        nonZero(round)
        returns (
            bool allocated,
            bool started,
            uint256 allocatedAmount,
            uint256 claimedCount,
            uint256 amount,
            address[] memory whitelist
        )
    {
        require(
            round <= totalTgeCount,
            "DesignateVault: exceed available round"
        );

        TgeInfo storage tgeinfo = tgeInfos[round];

        return (
            tgeinfo.allocated,
            tgeinfo.started,
            tgeinfo.allocatedAmount,
            tgeinfo.claimedCount,
            tgeinfo.amount,
            tgeinfo.whitelist
        );
    }

    ///@dev get the claim info of whitelist's person
    ///@param round  it is the period unit can claim once
    ///@param user person in whitelist
    function getWhitelistInfo(uint256 round, address user)
        external
        view
        nonZero(round)
        returns (bool joined, uint256 claimedTime)
    {
        require(
            round <= totalTgeCount,
            "DesignateVault: exceed available round"
        );

        TgeInfo storage tgeinfo = tgeInfos[round];
        if (tgeinfo.claimedTime[user].joined)
            return (
                tgeinfo.claimedTime[user].joined,
                tgeinfo.claimedTime[user].claimedTime
            );
    }
}