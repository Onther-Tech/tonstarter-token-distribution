const { expect } = require("chai");
const {
    BigNumber,
    FixedFormat,
    FixedNumber,
    formatFixed,
    parseFixed
} = require("@ethersproject/bignumber");

describe("WhitelistVault", function() {

  let whitelistVault , tos , provider;
  let maxInputOnceTime = 2;
  let deployer, user1, person1, person2, person3, person4,person5, person6 ;

  let name="WhitelistTestVault";

  let totalAllocatedAmount=100000;
  let totalTgeCount=5;
  let startTime, endTime;
  let periodTimesPerClaim = 60 * 10; // 10 mins

  let tgeRound = [
      {
       round : 1,
       amount : 10000,
       whitelist: []
      },
      {
       round : 2,
       amount : 22500,
       whitelist: []
      },
      {
       round : 3,
       amount : 22500,
       whitelist: []
      },
      {
       round : 4,
       amount : 22500,
       whitelist: []
      },
      {
       round : 5,
       amount : 22500,
       whitelist: []
      }
  ]
  totalTgeCount = tgeRound.length;


  before(async function () {
    let accounts = await ethers.getSigners();
    [deployer, user1, person1, person2, person3, person4, person5, person6 ] = accounts
    tgeRound[0].whitelist = [person1.address, person2.address, person3.address, person4.address];
    tgeRound[1].whitelist = [person1.address, person6.address];
    tgeRound[2].whitelist = [person1.address, person5.address];
    tgeRound[3].whitelist = [person1.address, person5.address, person6.address];
    tgeRound[4].whitelist = [person1.address, person6.address];


    const WhitelistVault = await ethers.getContractFactory("WhitelistVault");
    const TOS = await ethers.getContractFactory("TOS");

    tos = await TOS.deploy("TOS Token","TOS","1") ;
    tos.deployed();

    whitelistVault = await WhitelistVault.deploy(name, tos.address, maxInputOnceTime);
    whitelistVault.deployed();

    provider = ethers.provider;
  });

  it("check name, tos ", async function() {
    expect(await whitelistVault.name()).to.equal(name);
    expect(await whitelistVault.tos()).to.equal(tos.address);
    expect(await whitelistVault.maxInputOnceTime()).to.equal(maxInputOnceTime);
  });

  it("Check onlyOwner Function : ????????? ?????? ?????? ?????? : ?????????????????? ????????? ????????? ", async function() {
    this.timeout(1000000);
    let curBlock = await ethers.provider.getBlock();
    startTime = curBlock.timestamp ;

    await expect(
        whitelistVault.connect(user1).initialize(
            totalAllocatedAmount,
            totalTgeCount,
            startTime,
            periodTimesPerClaim
        )
      ).to.be.revertedWith("Accessible: Caller is not an admin");

    await expect(
        whitelistVault.connect(user1).allocateAmountTGE(
            1000
        )
      ).to.be.revertedWith("Accessible: Caller is not an admin");

    await expect(
        whitelistVault.connect(user1).addWhitelist(
            1, [user1.address]
        )
      ).to.be.revertedWith("Accessible: Caller is not an admin");

    await expect(
        whitelistVault.connect(user1).startRound(
          //  1
        )
      ).to.be.revertedWith("Accessible: Caller is not an admin");

    await expect(
        whitelistVault.connect(user1).withdraw(user1.address)
      ).to.be.revertedWith("Accessible: Caller is not an admin");
  });

  it("cannot recive ETH  ", async function() {
      await expect(
          deployer.sendTransaction({
              to: whitelistVault.address,
              value: ethers.BigNumber.from('1'),
          })
      ).to.be.reverted;
  });

  it("initialize : check balance : ????????? ??????(TOS) ????????? totalAllocatedAmount?????? ????????? ?????? ", async function() {

      this.timeout(1000000);
      let curBlock = await provider.getBlock();
      startTime = curBlock.timestamp + 15

      await  expect(
        whitelistVault.connect(deployer).initialize(
            totalAllocatedAmount,
            totalTgeCount,
            startTime,
            periodTimesPerClaim
        )
      ).to.be.revertedWith("BaseVault: balanceOf is insuffient");
  });

  it("initialize by owner : ???????????? ?????? ?????? ??????", async function() {
      this.timeout(1000000);

      let curBlock = await provider.getBlock();
      startTime = curBlock.timestamp + 15;
      endTime = startTime+(periodTimesPerClaim*totalTgeCount);

      await tos.mint(whitelistVault.address, totalAllocatedAmount);
      await whitelistVault.connect(deployer).initialize(
            totalAllocatedAmount,
            totalTgeCount,
            startTime,
            periodTimesPerClaim
      );
      expect(await whitelistVault.totalAllocatedAmount()).to.equal(totalAllocatedAmount);
      expect(await whitelistVault.totalTgeCount()).to.equal(totalTgeCount);
      expect(await whitelistVault.startTime()).to.equal(startTime);
      expect(await whitelistVault.periodTimesPerClaim()).to.equal(periodTimesPerClaim);
      expect(await whitelistVault.endTime()).to.equal(endTime);
  });

  it("initialize by owner exceute only once : ???????????? ????????? ??????????????? ??????.", async function() {
      this.timeout(1000000);
      await  expect(
        whitelistVault.connect(deployer).initialize(
            totalAllocatedAmount,
            totalTgeCount,
            startTime,
            periodTimesPerClaim
        )
      ).to.be.revertedWith("BaseVault: already initialized");

  });

  it("startRound : round 2: allocateAmountTGE ??? ???????????? ?????? ???????????? ????????? ??? ??????. ", async function() {
    await  expect(
        whitelistVault.connect(deployer).startRound(
          //  2
        )
      ).to.be.revertedWith("WhitelistVault: non-valid round");
  });

  it("allocateAmountTGE : check amount: ???????????? ??? ???????????? ????????? ??? ??????.", async function() {
    await  expect(
        whitelistVault.connect(deployer).allocateAmountTGE(
            totalAllocatedAmount+1
        )
      ).to.be.revertedWith("WhitelistVault: exceed total allocated amount");
  });


  it("allocateAmount by owner : round 1 ", async function() {
    let i = 0;
    await whitelistVault.connect(deployer).allocateAmountTGE(
            tgeRound[i].amount
        );
    let infos = await whitelistVault.getTgeInfos(i+1);
    expect(infos.allocated).to.equal(true);
    expect(infos.allocatedAmount).to.equal(tgeRound[i].amount);

    let allocatedAmountForRound = (totalAllocatedAmount- tgeRound[i].amount)/ (totalTgeCount-1) ;
    allocatedAmountForRound = parseInt(allocatedAmountForRound);
    expect(await whitelistVault.allocatedAmountForRound()).to.equal(allocatedAmountForRound);

  });

  it("allocateAmount : ??? ???????????? ?????? ????????? ????????? ??? ??? ??????. ", async function() {
    let i = 0;
    await  expect(
        whitelistVault.connect(deployer).allocateAmountTGE(
            tgeRound[i].amount
        )
      ).to.be.revertedWith("WhitelistVault: already allocated");
  });

  it("addWhitelist : check round: ?????? ???????????? ????????? totalTgeCount ?????? ?????? ??????.", async function() {
    let i = 1;
    await  expect(
        whitelistVault.connect(deployer).addWhitelist(
            totalTgeCount+1,
            tgeRound[i].whitelist
        )
    ).to.be.revertedWith("BaseVault: exceed available round");
  });

  it("addWhitelist : check input users length: ???????????? ????????????????????? ????????? ????????? ??????(maxInputOnceTime)?????? ????????????. ", async function() {
    let i = 0;
    await  expect(
        whitelistVault.connect(deployer).addWhitelist(
            tgeRound[i].round,
            tgeRound[i].whitelist
        )
    ).to.be.revertedWith("BaseVault: check input count at once time");
  });

  it("addWhitelist : 2 round ", async function() {
    let i = 1;
    await whitelistVault.connect(deployer).addWhitelist(
            tgeRound[i].round,
            tgeRound[i].whitelist
        );
    let infos = await whitelistVault.getTgeInfos(tgeRound[i].round);
    expect(infos.whitelist).to.deep.equal(tgeRound[i].whitelist);
  });

  it("startRound : 1 round : ?????????????????? ????????? ????????? ????????? ??? ??? ??????.", async function() {
    let i = 0;
    await  expect(
        whitelistVault.connect(deployer).startRound(
          //  tgeRound[i].round
        )
    ).to.be.revertedWith("WhitelistVault: non-valid round");
  });

  it("addWhitelist : 1 round:  ???????????? ????????????????????? ?????? ????????? ????????? ????????? ????????? ???????????? ?????????.", async function() {
    let i = 0;
    await whitelistVault.connect(deployer).addWhitelist(
            tgeRound[i].round,
            [person1.address, person2.address]
        );
    await whitelistVault.connect(deployer).addWhitelist(
            tgeRound[i].round,
            [person2.address, person3.address]
        );
    await whitelistVault.connect(deployer).addWhitelist(
            tgeRound[i].round,
            [person3.address, person4.address]
        );
    let infos = await whitelistVault.getTgeInfos(tgeRound[i].round);
    expect(infos.whitelist).to.deep.equal([person1.address, person2.address, person3.address, person4.address]);
  });

  it("startRound : 1 round   ", async function() {
    let i = 0;

    await whitelistVault.connect(deployer).startRound(
          //  tgeRound[i].round
        );
    let infos = await whitelistVault.getTgeInfos(tgeRound[i].round);
    expect(infos.started).to.equal(true);
    expect(infos.amount).to.equal(parseInt(tgeRound[i].amount/tgeRound[i].whitelist.length));
  });

  it("addWhitelist : 1 round : ?????? ????????? ???????????? ????????????????????? ????????? ??? ??????.", async function() {
    let i = 0;
    await  expect(
       whitelistVault.connect(deployer).addWhitelist(
            tgeRound[i].round,
            [person5.address]
        )
    ).to.be.revertedWith("BaseVault: already started");
  });

  it("startRound : check round: ?????? ???????????? ????????? totalTgeCount ?????? ?????? ??????.", async function() {
    await  expect(
       whitelistVault.connect(deployer).startRound(
         //   totalTgeCount+1
        )
    ).to.be.revertedWith("WhitelistVault: already started");
  });

  it("startRound : 1 round  : ?????? ????????? ???????????? ????????? ??? ??????.", async function() {
    let i = 0;
    await  expect(
       whitelistVault.connect(deployer).startRound(
         //   tgeRound[i].round
        )
    ).to.be.revertedWith("WhitelistVault: already started");
  });

  it("claim : 1 round : tge ??? ????????????????????? ???????????? ?????? ????????? person6 ???????????? ?????? ??????.   ", async function() {

      let currentRound = await whitelistVault.connect(deployer).currentRound();
      expect(ethers.BigNumber.from(currentRound).toString()).to.equal('1');
      let person6UnclaimedInfo = await whitelistVault.unclaimedInfos(person6.address);
      expect(ethers.BigNumber.from(person6UnclaimedInfo.count).toString()).to.equal('0');
      expect(ethers.BigNumber.from(person6UnclaimedInfo.amount).toString()).to.equal('0');

  });


  it("claim : 1 round : tge ??? ?????????????????? person3 ??? 1?????? ???????????? ???????????? ??????.  ", async function() {
      let currentRound = await whitelistVault.connect(person3).currentRound();
      let infos = await whitelistVault.getTgeInfos(currentRound);
      let amount = ethers.BigNumber.from(infos.allocatedAmount).div(ethers.BigNumber.from(infos.whitelist.length));
      expect(ethers.BigNumber.from(infos.amount).toString()).to.equal(amount.toString());

      let person3UnclaimedInfo = await whitelistVault.unclaimedInfos(person3.address);
      let preTosBalance = await tos.balanceOf(person3.address);
      await whitelistVault.connect(person3).claim();
      let afterTosBalance = await tos.balanceOf(person3.address);
      expect(afterTosBalance).to.equal(ethers.BigNumber.from(preTosBalance).add(person3UnclaimedInfo.amount));

  });


  it("startRound : 2 round : ?????? ????????? ???????????? ????????? ??? ??? ??????.", async function() {
    let i = 2;
    await  expect(
       whitelistVault.connect(deployer).startRound(
          //  i
        )
    ).to.be.revertedWith("WhitelistVault: already started");
  });

  it("startRound : 2 round  ", async function() {
    let i = 2;

    // ???????????? 600 ???, periodTimesPerClaim
    //console.log('tgeRound[i-1]', i-1, tgeRound[i-1]);
    let lastClaimedRound = await whitelistVault.connect(deployer).lastClaimedRound();
    //console.log('lastClaimedRound', lastClaimedRound.toString());

    let currentRound = await whitelistVault.connect(deployer).currentRound();
    let currentRoundNumber = ethers.BigNumber.from(currentRound).toNumber();
    let roundStartTime = await whitelistVault.connect(deployer).startRoundTime(i);
    //console.log('currentRound', currentRound.toString());

    let nowInt = parseInt(Date.now()/1000);
    let round2StartTimeNumber = ethers.BigNumber.from(roundStartTime).toNumber();

    await ethers.provider.send("evm_increaseTime", [periodTimesPerClaim]);
    await ethers.provider.send("evm_mine");

    currentRound = await whitelistVault.connect(deployer).currentRound();


    await whitelistVault.connect(deployer).startRound();
    let infos = await whitelistVault.getTgeInfos(i);

    expect(infos.started).to.equal(true);
    expect(infos.amount).to.equal(parseInt(tgeRound[i-1].amount/tgeRound[i-1].whitelist.length));

  });

  it("unclaimedInfos : tge ?????????, person2 ??????????????? ?????? ???????????? ?????? ????????? ????????????. ", async function() {

      let i = 1;
      let infos = await whitelistVault.getTgeInfos(i);
      let amount = ethers.BigNumber.from(infos.allocatedAmount).div(ethers.BigNumber.from(infos.whitelist.length));
      expect(ethers.BigNumber.from(infos.amount).toString()).to.equal(amount.toString());

      let person2UnclaimedInfo = await whitelistVault.unclaimedInfos(person2.address);
      let person2UnclaimedInfosDetails = await whitelistVault.unclaimedInfosDetails(person2.address);


      expect(person2UnclaimedInfosDetails._rounds[0].toString()).to.equal('1');
      expect(person2UnclaimedInfosDetails._amounts[0].toString()).to.equal(amount.toString());
      expect(person2UnclaimedInfo.count).to.equal(1);
      expect(ethers.BigNumber.from(person2UnclaimedInfo.amount).toString()).to.equal(amount.toString());
  });

  it("unclaimedInfos : tge ?????????, person1 ??????????????? ?????? ???????????? ?????? ????????? ????????????. 2?????? ??????????????? 1???????????? ??????????????? ?????? ????????? ???????????? ????????????. ", async function() {

      let currentRound = await whitelistVault.connect(person1).currentRound();
      let sumOfAmount = ethers.BigNumber.from('0');

      for(let i=1 ; i <= currentRound.toNumber(); i++){
        let infos = await whitelistVault.getTgeInfos(i);
        let amount = ethers.BigNumber.from(infos.allocatedAmount).div(ethers.BigNumber.from(infos.whitelist.length));
        sumOfAmount = sumOfAmount.add(amount);
      }

      let person1UnclaimedInfo = await whitelistVault.unclaimedInfos(person1.address);
      expect(person1UnclaimedInfo.count).to.equal(currentRound);
      expect(ethers.BigNumber.from(person1UnclaimedInfo.amount).toString()).to.equal(sumOfAmount.toString());
  });


  it("claim : tge ?????????, 2???????????? ?????? ????????? person6 ??? 2????????? ???????????? ??????.", async function() {
      // await ethers.provider.send("evm_increaseTime", [periodTimesPerClaim]);
      // await ethers.provider.send('evm_mine');
      let currentRound = await whitelistVault.connect(person6).currentRound();
      expect(currentRound).to.equal(2);

      let infos = await whitelistVault.getTgeInfos(currentRound);
      let amount = ethers.BigNumber.from(infos.allocatedAmount).div(ethers.BigNumber.from(infos.whitelist.length));
      expect(ethers.BigNumber.from(infos.amount).toString()).to.equal(amount.toString());

      let person6UnclaimedInfo = await whitelistVault.unclaimedInfos(person6.address);
      let preTosBalance = await tos.balanceOf(person6.address);
      await whitelistVault.connect(person6).claim();
      let afterTosBalance = await tos.balanceOf(person6.address);
      expect(afterTosBalance).to.equal(ethers.BigNumber.from(preTosBalance).add(person6UnclaimedInfo.amount));
  });

  it("claim : tge ?????????, person1 , 3??????????????? ?????? ??????????????? ????????? ???????????? ??????. 3????????? ???????????? ??????????????????.", async function() {
      await ethers.provider.send("evm_increaseTime", [periodTimesPerClaim]);
      await ethers.provider.send('evm_mine');
      let currentRound = await whitelistVault.connect(person1).currentRound();
      expect(currentRound).to.equal(3);
      let sumOfAmount = ethers.BigNumber.from('0');
      let count = 0;
      for(let i=1 ; i <= currentRound.toNumber(); i++){
        let infos = await whitelistVault.getTgeInfos(i);

        if(infos.started){
          let amount = ethers.BigNumber.from(infos.allocatedAmount).div(ethers.BigNumber.from(infos.whitelist.length));
          sumOfAmount = sumOfAmount.add(amount);
          count ++;
        }
      }
      let person1UnclaimedInfo = await whitelistVault.unclaimedInfos(person1.address);
      expect(person1UnclaimedInfo.count).to.equal(count);
      expect(ethers.BigNumber.from(person1UnclaimedInfo.amount).toString()).to.equal(sumOfAmount.toString());

      let preTosBalance = await tos.balanceOf(person1.address);
      await whitelistVault.connect(person1).claim();
      let afterTosBalance = await tos.balanceOf(person1.address);
      expect(afterTosBalance).to.equal(ethers.BigNumber.from(preTosBalance).add(sumOfAmount));
  });

  it("claim : tge ??? ????????????????????? 1???????????? ?????? ???????????? ???????????? ??????????????? ???????????? ??? ??? ??????. ", async function() {
      let person4UnclaimedInfo = await whitelistVault.unclaimedInfos(person4.address);
      let preTosBalance = await tos.balanceOf(person4.address);
      await whitelistVault.connect(person4).claim();
      let afterTosBalance = await tos.balanceOf(person4.address);
      expect(person4UnclaimedInfo.amount).to.above(0);
      expect(afterTosBalance).to.equal(ethers.BigNumber.from(preTosBalance).add(person4UnclaimedInfo.amount));
  });


  it("addWhitelist : 3 round ", async function() {
    let i = 2;
    await whitelistVault.connect(deployer).addWhitelist(
            tgeRound[i].round,
            tgeRound[i].whitelist
        );
    let infos = await whitelistVault.getTgeInfos(tgeRound[i].round);
    expect(infos.whitelist).to.deep.equal(tgeRound[i].whitelist);
  });

  it("addWhitelist : 4 round ", async function() {
    let i = 3;
    await whitelistVault.connect(deployer).addWhitelist(
            tgeRound[i].round,
            [person1.address, person5.address]
        );
    await whitelistVault.connect(deployer).addWhitelist(
            tgeRound[i].round,
            [person6.address ]
        );
    let infos = await whitelistVault.getTgeInfos(tgeRound[i].round);
    expect(infos.whitelist).to.deep.equal(tgeRound[i].whitelist);
  });

  it("addWhitelist : 5 round ", async function() {
    let i = 4;
    await whitelistVault.connect(deployer).addWhitelist(
            tgeRound[i].round,
            tgeRound[i].whitelist
        );
    let infos = await whitelistVault.getTgeInfos(tgeRound[i].round);
    expect(infos.whitelist).to.deep.equal(tgeRound[i].whitelist);
  });


  it("addWhitelist : 5 round,  person1 , 3?????? ????????????????????????, 3,4?????? ????????? ?????? 5????????? ????????????.  ", async function() {

      let targetRound = 5;
      let loop = true;
      while(loop){
        await ethers.provider.send("evm_increaseTime", [periodTimesPerClaim]);
        await ethers.provider.send('evm_mine');
        let currentRound = await whitelistVault.currentRound();
        if(currentRound == targetRound ) loop = false;
      }

      await whitelistVault.connect(deployer).addWhitelist(
            tgeRound[targetRound-1].round,
            tgeRound[targetRound-1].whitelist
      );
      let infos = await whitelistVault.getTgeInfos(targetRound);
      expect(infos.whitelist).to.deep.equal(tgeRound[targetRound-1].whitelist);
  });

  it("claim : 5 round, person1 , startRound ?????? ????????????, ??????????????? ??????.", async function() {

      let person1UnclaimedInfo = await whitelistVault.unclaimedInfos(person1.address);
      expect(person1UnclaimedInfo.count).to.equal(0);
      expect(ethers.BigNumber.from(person1UnclaimedInfo.amount).toString()).to.equal('0');

  });

  it("startRound : 5 round, person1, 3,4?????? ????????? ?????? 5????????? ????????????. 3,4 ?????????????????? ?????????????????????.", async function() {
      let i = 5;
      let lastClaimedRound = await whitelistVault.connect(deployer).lastClaimedRound();
      let currentRound = await whitelistVault.currentRound();

      let sumOfAmount = 0;
      for(let i=lastClaimedRound.toNumber()+1 ; i <= currentRound.toNumber(); i++){
        sumOfAmount += tgeRound[i-1].amount;
      }

      await whitelistVault.connect(deployer).startRound(
        //i
        );
      let infos = await whitelistVault.getTgeInfos(i);
      expect(infos.started).to.equal(true);
      expect(infos.allocated).to.equal(true);
      expect(infos.allocatedAmount.toNumber()).to.equal(sumOfAmount);
      expect(infos.amount).to.equal(parseInt(sumOfAmount/tgeRound[i-1].whitelist.length));

  });

  it("claim :  5 round, person1, 3,4 ?????????????????? ????????????, 5????????? ???????????????.  ", async function() {

      let person1UnclaimedInfo = await whitelistVault.unclaimedInfos(person1.address);
      let preTosBalance = await tos.balanceOf(person1.address);
      await whitelistVault.connect(person1).claim();
      let afterTosBalance = await tos.balanceOf(person1.address);
      expect(person1UnclaimedInfo.amount).to.above(0);
      expect(afterTosBalance).to.equal(ethers.BigNumber.from(preTosBalance).add(person1UnclaimedInfo.amount));
  });

  it("claim :  5 round, person2,  ", async function() {

      let person2UnclaimedInfo = await whitelistVault.unclaimedInfos(person2.address);
      let preTosBalance = await tos.balanceOf(person2.address);
      await whitelistVault.connect(person2).claim();
      let afterTosBalance = await tos.balanceOf(person2.address);
      expect(person2UnclaimedInfo.amount).to.above(0);
      expect(afterTosBalance).to.equal(ethers.BigNumber.from(preTosBalance).add(person2UnclaimedInfo.amount));
  });
  it("claim :  5 round, person3, ???????????? ????????? ??????. ", async function() {

      let person3UnclaimedInfo = await whitelistVault.unclaimedInfos(person3.address);
      expect(person3UnclaimedInfo.amount).to.equal(0);
      expect(person3UnclaimedInfo.count).to.equal(0);
  });
  it("claim :  5 round, person4, ???????????? ????????? ??????.  ", async function() {

      let person4UnclaimedInfo = await whitelistVault.unclaimedInfos(person4.address);
      expect(person4UnclaimedInfo.amount).to.equal(0);
      expect(person4UnclaimedInfo.count).to.equal(0);
  });
  it("claim :  5 round, person5, 4????????? ????????????????????????. startRound??? ??????????????? ??????, ???????????? ????????? ??????.  ", async function() {

      let person5UnclaimedInfo = await whitelistVault.unclaimedInfos(person5.address);
      expect(person5UnclaimedInfo.amount).to.equal(0);
      expect(person5UnclaimedInfo.count).to.equal(0);
  });

  it("claim :  5 round, person6, 3,4 ?????????????????? ????????????, 5????????? ???????????????. 4????????? ????????????????????????. 4 ????????? startRound??? ???????????? ?????????. 5????????? ????????? ???????????????. ", async function() {

       let i = 5;
      let lastClaimedRound = 3;
      let currentRound = await whitelistVault.currentRound();

      let sumOfAmount = 0;
      for(let i=lastClaimedRound ; i <= currentRound.toNumber(); i++){
        sumOfAmount += tgeRound[i-1].amount;
      }

      let infos = await whitelistVault.getTgeInfos(i);
      expect(infos.started).to.equal(true);
      expect(infos.allocated).to.equal(true);
      expect(infos.allocatedAmount.toNumber()).to.equal(sumOfAmount);
      expect(infos.amount).to.equal(parseInt(sumOfAmount/tgeRound[i-1].whitelist.length));

      let person6UnclaimedInfo = await whitelistVault.unclaimedInfos(person6.address);
      let preTosBalance = await tos.balanceOf(person6.address);
      await whitelistVault.connect(person6).claim();
      let afterTosBalance = await tos.balanceOf(person6.address);
      expect(person6UnclaimedInfo.amount).to.equal(infos.amount);
      expect(afterTosBalance).to.equal(ethers.BigNumber.from(preTosBalance).add(person6UnclaimedInfo.amount));
  });

  it("totalClaimedAmount :  ??? ???????????? ????????? ???????????? ???????????? ??????.", async function() {

      let totalClaimedAmount = await whitelistVault.totalClaimedAmount();
      let totalAllocatedAmount = await whitelistVault.totalAllocatedAmount();
      expect(totalClaimedAmount).to.equal(totalAllocatedAmount);
  });


  it("availableWithdrawAmount : ???????????? ??????????????? ????????? ????????????. ??? ??????????????? ??????????????????. ", async function() {
    let availableWithdrawAmount = await whitelistVault.availableWithdrawAmount();
    expect(availableWithdrawAmount).to.equal(0);

    let addAmount = 1000;
    await tos.connect(deployer).mint(whitelistVault.address, addAmount);
    availableWithdrawAmount = await whitelistVault.availableWithdrawAmount();
    expect(availableWithdrawAmount).to.equal(addAmount);
  });

  it("withdraw : ???????????? ???????????? ????????? ?????? ????????? ????????? ??????. ??? ??????????????? ??????????????????. ", async function() {
    let availableWithdrawAmount = await whitelistVault.availableWithdrawAmount();
    let preTosBalance = await tos.balanceOf(person5.address);
    await whitelistVault.connect(deployer).withdraw(person5.address);
    let afterTosBalance = await tos.balanceOf(person5.address);
    expect(afterTosBalance).to.equal(ethers.BigNumber.from(preTosBalance).add(availableWithdrawAmount));
  });


});
