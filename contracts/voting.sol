// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Voting is Ownable {
    struct Voter {
        bool isRegistred;
        bool hasVoted;
        uint votedProporalId;
    }

    struct Proposal {
        string description;
        uint voteCount;
    }

    Proposal[] public Proposals;

    enum WorkflowStatus {
        RegisteringVoters,
        ProposalsRegistrationStarted,
        ProposalsRegistrationEnded,
        VotingSessionStarted,
        VotingSessionEnded,
        VotesTallied
    }

    uint public winningProposalId;
    mapping(address => Voter) public Voters;
    WorkflowStatus status;

    event VoterRegistered(address indexed voterAddress);
    event WorkflowStatusChange(
        WorkflowStatus previousStatus,
        WorkflowStatus newStatus
    );
    event ProposalRegistered(uint indexed proposalId);
    event Voted(address indexed voter, uint proposalId);

    modifier onlyVoters() {
        require(
            Voters[msg.sender].isRegistred == true,
            "You are not one of the authorized voters."
        );
        _;
    }

    constructor() Ownable(msg.sender) {}

    function addVoter(address _addr) external onlyOwner {
        require(
            status == WorkflowStatus.RegisteringVoters,
            "This must happen at the very beginning of the process."
        );
        require(Voters[_addr].isRegistred != true, "Already registered voter.");

        Voters[_addr] = Voter(true, false, 0);

        emit VoterRegistered(_addr);
    }

    function startProposalsRegistration() external onlyOwner {
        require(
            status == WorkflowStatus.RegisteringVoters,
            "This must happen during the voter registration step."
        );

        status = WorkflowStatus.ProposalsRegistrationStarted;

        emit WorkflowStatusChange(WorkflowStatus.RegisteringVoters, status);
    }

    function addProposal(
        string calldata proposalDescription
    ) external onlyVoters {
        require(
            status == WorkflowStatus.ProposalsRegistrationStarted,
            "This is not the time to make proposals."
        );

        Proposals.push(Proposal(proposalDescription, 0));

        emit ProposalRegistered(Proposals.length - 1);
    }

    function stopProposalsRegistration() external onlyOwner {
        require(
            status == WorkflowStatus.ProposalsRegistrationStarted,
            "This must happen when the voters have finished making their proposals."
        );

        status = WorkflowStatus.ProposalsRegistrationEnded;

        emit WorkflowStatusChange(
            WorkflowStatus.ProposalsRegistrationStarted,
            status
        );
    }

    function startVoting() external onlyOwner {
        require(
            status == WorkflowStatus.ProposalsRegistrationEnded,
            "This must happen when the proposals registration ended."
        );

        status = WorkflowStatus.VotingSessionStarted;

        emit WorkflowStatusChange(
            WorkflowStatus.ProposalsRegistrationEnded,
            status
        );
    }

    function vote(uint _votedProporalId) external onlyVoters {
        require(
            status == WorkflowStatus.VotingSessionStarted,
            "Voting is not yet allowed."
        );
        require(
            Voters[msg.sender].hasVoted == false,
            "The user has already voted"
        );
        require(
            _votedProporalId < Proposals.length,
            "The vote must correspond to the proposals."
        );

        Voters[msg.sender].hasVoted = true;
        Voters[msg.sender].votedProporalId = _votedProporalId;

        Proposal memory proposalVoted = Proposals[_votedProporalId];
        proposalVoted.voteCount += 1;
        Proposals[_votedProporalId] = proposalVoted;

        emit Voted(msg.sender, _votedProporalId);
    }

    function stopVoting() external onlyOwner {
        require(
            status == WorkflowStatus.VotingSessionStarted,
            "This must happen during the vote."
        );

        status = WorkflowStatus.VotingSessionEnded;

        emit WorkflowStatusChange(WorkflowStatus.VotingSessionStarted, status);
    }

    function countingFinalVote() external onlyOwner {
        require(
            status == WorkflowStatus.VotingSessionEnded,
            "This must happen at the end of the voting process."
        );

        winningProposalId = 0; // pas necessaire

        for (uint i = 1; i < Proposals.length; i++) {
            if (Proposals[i].voteCount > Proposals[i - 1].voteCount) {
                winningProposalId = i;
            }
        }

        status = WorkflowStatus.VotesTallied;

        emit WorkflowStatusChange(WorkflowStatus.VotingSessionEnded, status);
    }

    function getWinner() external view returns (Proposal memory) {
        require(
            status == WorkflowStatus.VotesTallied,
            "It must happen after votes tallied."
        );

        return Proposals[winningProposalId];
    }
}
