// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title BlueCarbonRegistry
 * @dev Registry for storing verified coastal restoration records on-chain.
 */
contract BlueCarbonRegistry {
    struct Record {
        string submissionId;
        string userId;
        int256 latitude; // Stored as latitude * 10^6 for precision
        int256 longitude; // Stored as longitude * 10^6 for precision
        uint256 timestamp;
        uint256 credits;
        string imageHash;
    }

    // Mapping from submissionId to Record
    mapping(string => Record) private records;
    // Mapping to track existence of submissionId
    mapping(string => bool) private exists;
    
    address public owner;
    uint256 public totalRecords;

    event RecordStored(
        string indexed submissionId, 
        string indexed userId, 
        uint256 credits, 
        string imageHash,
        uint256 timestamp
    );
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * @param newOwner The address to transfer ownership to.
     */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "New owner is the zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /**
     * @dev Stores a verified restoration record on-chain.
     * @param _submissionId Unique identifier for the submission.
     * @param _userId Unique identifier for the user.
     * @param _latitude Latitude * 10^6.
     * @param _longitude Longitude * 10^6.
     * @param _timestamp Unix timestamp of the restoration activity.
     * @param _credits Number of credits assigned.
     * @param _imageHash Hash of the evidence image.
     */
    function storeRecord(
        string calldata _submissionId,
        string calldata _userId,
        int256 _latitude,
        int256 _longitude,
        uint256 _timestamp,
        uint256 _credits,
        string calldata _imageHash
    ) external onlyOwner {
        require(!exists[_submissionId], "Record already exists for this submissionId");

        records[_submissionId] = Record({
            submissionId: _submissionId,
            userId: _userId,
            latitude: _latitude,
            longitude: _longitude,
            timestamp: _timestamp,
            credits: _credits,
            imageHash: _imageHash
        });

        exists[_submissionId] = true;
        totalRecords++;

        emit RecordStored(_submissionId, _userId, _credits, _imageHash, block.timestamp);
    }

    /**
     * @dev Returns a stored record by its submissionId.
     * @param _submissionId The unique identifier for the submission.
     */
    function getRecord(string calldata _submissionId) external view returns (Record memory) {
        require(exists[_submissionId], "Record does not exist");
        return records[_submissionId];
    }

    /**
     * @dev Checks if a record exists for a given submissionId.
     * @param _submissionId The unique identifier for the submission.
     */
    function recordExists(string calldata _submissionId) external view returns (bool) {
        return exists[_submissionId];
    }
}
