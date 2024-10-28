const { expect, assert } = require("chai");
const hre = require("hardhat");

const {
    loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Tests Voting Contract", function () {

    let deployedContract;
    let owner, addr1, addr2;

    describe("Tests contract initialization", function () {

        beforeEach(async function () {
            [owner, addr1, addr2] = await hre.ethers.getSigners();
            let Voting = await hre.ethers.deployContract("Voting");
            deployedContract = Voting;
        });

        it('Should deploy voting contract and get the owner', async function () {
            let deploymentOwner = await deployedContract.owner();
            assert(deploymentOwner)
        })
    });

    describe("Tests States Management", function () {
        this.beforeEach(async function () {
            [owner, addr1, addr2] = await hre.ethers.getSigners();
            let Voting = await hre.ethers.deployContract("Voting");
            deployedContract = Voting;
        })

        it('Should NOT change workflow status from RegisteringVoters to ProposalsRegistrationStarted if the caller is NOT the owner', async function () {
            await expect(deployedContract.connect(addr1).startProposalsRegistering()).to.be.revertedWithCustomError(deployedContract, "OwnableUnauthorizedAccount").withArgs(addr1.address)
        })

        it('Should EMIT event when workflow status is changed from RegisteringVoters to ProposalsRegistrationStarted', async function () {
            await expect(deployedContract.startProposalsRegistering()).to.emit(deployedContract, 'WorkflowStatusChange').withArgs(0, 1)
        })

        it('Should NOT change workflow status to ProposalsRegistrationStarted if actual workflow status is NOT RegisteringVoters', async function () {
            let transaction = await deployedContract.startProposalsRegistering();
            await transaction.wait();

            await expect(deployedContract.startProposalsRegistering()).to.be.revertedWith("Registering proposals cant be started now")
        })

        it('Should NOT change workflow status from ProposalsRegistrationStarted to ProposalsRegistrationEnded if the caller is NOT the owner', async function () {
            await expect(deployedContract.connect(addr1).endProposalsRegistering()).to.be.revertedWithCustomError(deployedContract, "OwnableUnauthorizedAccount").withArgs(addr1.address)
        })

        it('Should EMIT event when workflow status is changed from ProposalsRegistrationStarted to ProposalsRegistrationEnded', async function () {
            let transaction = await deployedContract.startProposalsRegistering();
            await transaction.wait();

            await expect(deployedContract.endProposalsRegistering()).to.emit(deployedContract, 'WorkflowStatusChange').withArgs(1, 2)
        })

        it('Should NOT change workflow status to ProposalsRegistrationEnded if actual workflow status is NOT ProposalsRegistrationStarted', async function () {
            await expect(deployedContract.endProposalsRegistering()).to.be.revertedWith("Registering proposals havent started yet")
        })

        it('Should NOT change workflow status from ProposalsRegistrationEnded to VotingSessionStarted if the caller is NOT the owner', async function () {
            await expect(deployedContract.connect(addr1).startVotingSession()).to.be.revertedWithCustomError(deployedContract, "OwnableUnauthorizedAccount").withArgs(addr1.address)
        })

        it('Should EMIT event when workflow status is changed from ProposalsRegistrationEnded to VotingSessionStarted', async function () {
            let transaction1 = await deployedContract.startProposalsRegistering();
            await transaction1.wait();

            let transaction2 = await deployedContract.endProposalsRegistering();
            await transaction2.wait();

            await expect(deployedContract.startVotingSession()).to.emit(deployedContract, 'WorkflowStatusChange').withArgs(2, 3)
        })

        it('Should NOT change workflow status to VotingSessionStarted if actual workflow status is NOT ProposalsRegistrationEnded', async function () {
            await expect(deployedContract.startVotingSession()).to.be.revertedWith("Registering proposals phase is not finished")
        })

        it('Should NOT change workflow status from VotingSessionStarted to VotingSessionEnded if the caller is NOT the owner', async function () {
            await expect(deployedContract.connect(addr1).endVotingSession()).to.be.revertedWithCustomError(deployedContract, "OwnableUnauthorizedAccount").withArgs(addr1.address)
        })

        it('Should EMIT event when workflow status is changed from VotingSessionStarted to VotingSessionEnded', async function () {
            let transaction1 = await deployedContract.startProposalsRegistering();
            await transaction1.wait();

            let transaction2 = await deployedContract.endProposalsRegistering();
            await transaction2.wait();

            let transaction3 = await deployedContract.startVotingSession();
            await transaction3.wait();

            await expect(deployedContract.endVotingSession()).to.emit(deployedContract, 'WorkflowStatusChange').withArgs(3, 4)
        })

        it('Should NOT change workflow status to VotingSessionEnded if actual workflow status is NOT VotingSessionStarted', async function () {
            await expect(deployedContract.endVotingSession()).to.be.revertedWith("Voting session havent started yet")
        })
    })

    describe("Tests voters registration", function () {
        this.beforeEach(async function () {
            [owner, addr1, addr2, addr3] = await hre.ethers.getSigners();
            let Voting = await hre.ethers.deployContract("Voting");
            deployedContract = Voting;
        })

        it('Should NOT add voter if NOT the owner', async function () {
            await expect(deployedContract.connect(addr1).addVoter(addr2.address)).to.be.revertedWithCustomError(deployedContract, "OwnableUnauthorizedAccount").withArgs(addr1.address)
        })

        it('Should NOT add voter if workflow status is NOT RegisteringVoters', async function () {
            let transaction = await deployedContract.startProposalsRegistering();
            await transaction.wait();

            await expect(deployedContract.addVoter(addr1.address)).to.be.revertedWith("Voters registration is not open yet")
        })

        it('Should EMIT event when voter is registred', async function () {
            await expect(deployedContract.addVoter(addr1.address)).to.emit(deployedContract, 'VoterRegistered').withArgs(addr1.address)
        })

        it('Should NOT register voter if is already registred', async function () {
            let transaction = await deployedContract.addVoter(addr1.address);
            await transaction.wait();

            await expect(deployedContract.addVoter(addr1.address)).to.be.revertedWith("Already registered")
        })
    })

    describe("Tests addition of voter's proposals", function () {
        this.beforeEach(async function () {
            [owner, addr1, addr2] = await hre.ethers.getSigners();
            let Voting = await hre.ethers.deployContract("Voting");
            deployedContract = Voting;

        })

        it('Should NOT add proposal if NOT voter', async function () {
            //let transaction = await deployedContract.addVoter(addr1.address);
            //await transaction.wait();

            await expect(deployedContract.connect(addr2).addProposal("Obama")).to.be.revertedWith("You're not a voter")
        })

        it('Should NOT add proposal if workflow status is NOT ProposalsRegistrationStarted', async function () {
            let transaction1 = await deployedContract.addVoter(addr1.address);
            await transaction1.wait();

            await expect(deployedContract.connect(addr1).addProposal("Obama")).to.be.revertedWith("Proposals are not allowed yet")
        })

        it('Should NOT add empty proposal', async function () {
            let transaction1 = await deployedContract.addVoter(addr1.address);
            await transaction1.wait();

            let transaction2 = await deployedContract.startProposalsRegistering();
            await transaction2.wait();

            await expect(deployedContract.connect(addr1).addProposal("")).to.be.revertedWith("Vous ne pouvez pas ne rien proposer")
        })

        it('Should EMIT event when proposal is registred', async function () {
            let transaction1 = await deployedContract.addVoter(addr1.address);
            await transaction1.wait();

            let transaction2 = await deployedContract.startProposalsRegistering();
            await transaction2.wait();

            await expect(deployedContract.connect(addr1).addProposal("Obama")).to.emit(deployedContract, 'ProposalRegistered').withArgs(1)
        })
    })

    describe("Tests Voters and Proposals getters", function () {
        describe("Tests Voters getter", function () {
            this.beforeEach(async function () {
                [owner, addr1, addr2, addr3] = await hre.ethers.getSigners();
                let Voting = await hre.ethers.deployContract("Voting");
                deployedContract = Voting;

                let transaction1 = await deployedContract.addVoter(addr1.address);
                await transaction1.wait();

                let transaction2 = await deployedContract.addVoter(addr2.address);
                await transaction2.wait();


                // let transaction2 = await deployedContract.startProposalsRegistering();
                // await transaction2.wait();

                // let transaction3 = await deployedContract.connect(addr1).addProposal("Obama")
                // await transaction3.wait();

                // let transaction4 = await deployedContract.endProposalsRegistering();
                // await transaction4.wait();
            })

            it('Should NOT get voter informations if the caller is NOT a member of the voters list', async function () {
                await expect(deployedContract.connect(addr3).getVoter(addr1.address)).to.be.revertedWith("You're not a voter");
            })

            it('Should GET any voter information from voters mapping IF the caller is member of voters list', async function () {
                let voter = await deployedContract.connect(addr1).getVoter(addr2.address);
                assert(voter.isRegistered == true)
            })

        })

        describe("Tests Proposals getter", function () {
            this.beforeEach(async function () {
                [owner, addr1, addr2, addr3] = await hre.ethers.getSigners();
                let Voting = await hre.ethers.deployContract("Voting");
                deployedContract = Voting;

                let transaction1 = await deployedContract.addVoter(addr1.address);
                await transaction1.wait();

                let transaction2 = await deployedContract.addVoter(addr2.address);
                await transaction2.wait();

                let transaction3 = await deployedContract.startProposalsRegistering();
                await transaction3.wait();

                let transaction4 = await deployedContract.connect(addr1).addProposal("Obama");
                await transaction4.wait();
            })

            it('Should NOT get proposal information if the caller is NOT a member of the voters list', async function () {
                await expect(deployedContract.connect(addr3).getOneProposal(0)).to.be.revertedWith("You're not a voter");
            })

            it('Should GET any proposal information if the caller IS member of voters list', async function () {
                let proposal = await deployedContract.connect(addr1).getOneProposal(1);
                assert(proposal.description == "Obama")
            })
        })
    })

    describe("Tests voting system", function () {
        this.beforeEach(async function () {
            [owner, addr1, addr2, addr3] = await hre.ethers.getSigners();
            let Voting = await hre.ethers.deployContract("Voting");
            deployedContract = Voting;

            let transaction1 = await deployedContract.addVoter(addr1.address);
            await transaction1.wait();

            let transaction2 = await deployedContract.addVoter(addr2.address);
            await transaction2.wait();

            let transaction3 = await deployedContract.startProposalsRegistering();
            await transaction3.wait();

            let transaction4 = await deployedContract.connect(addr1).addProposal("Obama");
            await transaction4.wait();

            let transaction5 = await deployedContract.connect(addr2).addProposal("Trump");
            await transaction5.wait();

            let transaction6 = await deployedContract.endProposalsRegistering();
            await transaction6.wait();
        })

        it('Should NOT vote if the caller is NOT in the voters list', async function () {
            await expect(deployedContract.connect(addr3).setVote(1)).to.be.revertedWith("You're not a voter")
        })

        it('Should NOT vote if workflow status is NOT VotingSessionStarted', async function () {
            await expect(deployedContract.connect(addr1).setVote(1)).to.be.revertedWith("Voting session havent started yet")
        })

        it('Should NOT vote if the caller has already voted', async function () {
            let transaction1 = await deployedContract.startVotingSession();
            await transaction1.wait();

            let transaction2 = await deployedContract.connect(addr1).setVote(0);
            await transaction2.wait();

            await expect(deployedContract.connect(addr1).setVote(0)).to.be.revertedWith("You have already voted")
        })

        it('Should NOT vote if the caller entered an id of an unknown proposal', async function () {
            let transaction1 = await deployedContract.startVotingSession();
            await transaction1.wait();

            await expect(deployedContract.connect(addr1).setVote(5)).to.be.revertedWith("Proposal not found")

        })

        it('Should EMIT event when the authorized caller has successfully voted', async function () {
            let transaction1 = await deployedContract.startVotingSession();
            await transaction1.wait();

            await expect(deployedContract.connect(addr1).setVote(0)).to.emit(deployedContract, "Voted").withArgs(addr1.address, 0)
        })

    })

    describe("Tests tally Votes", function () {
        this.beforeEach(async function () {
            [owner, addr1, addr2, addr3] = await hre.ethers.getSigners();
            let Voting = await hre.ethers.deployContract("Voting");
            deployedContract = Voting;

            let transaction1 = await deployedContract.addVoter(addr1.address);
            await transaction1.wait();

            let transaction2 = await deployedContract.addVoter(addr2.address);
            await transaction2.wait();

            let transaction3 = await deployedContract.startProposalsRegistering();
            await transaction3.wait();

            let transaction4 = await deployedContract.connect(addr1).addProposal("Obama");
            await transaction4.wait();

            let transaction5 = await deployedContract.connect(addr2).addProposal("Trump");
            await transaction5.wait();

            let transaction6 = await deployedContract.endProposalsRegistering();
            await transaction6.wait();

            let transaction7 = await deployedContract.startVotingSession();
            await transaction7.wait();

            let transaction8 = await deployedContract.connect(addr1).setVote(0);
            await transaction8.wait();

        })

        it('Should NOT be able to use tally vote function if the caller is NOT the owner', async function () {
            await expect(deployedContract.connect(addr1).tallyVotes()).to.be.revertedWithCustomError(deployedContract, "OwnableUnauthorizedAccount").withArgs(addr1.address)
        })

        it('Should NOT use tally vote function if workflow status is NOT VotingSessionEnded', async function () {
            await expect(deployedContract.tallyVotes()).to.be.revertedWith("Current status is not voting session ended")
        })

        it('Should EMIT event when tally vote function was successfully executed', async function () {
            let transaction9 = await deployedContract.endVotingSession();
            await transaction9.wait();

            await expect(deployedContract.tallyVotes()).to.emit(deployedContract, "WorkflowStatusChange").withArgs(4, 5)
        })
    })
})