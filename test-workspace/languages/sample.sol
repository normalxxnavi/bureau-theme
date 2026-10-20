// SPDX-License-Identifier: MIT
// Archivo de prueba del tema: Solidity.
pragma solidity ^0.8.24;

/// @title Registro de Objetos de Poder
contract Registry {
    enum Threat { Low, High }

    struct ObjectOfPower {
        string code;
        Threat threat;
        uint256 resonance;
    }

    uint256 public constant MAX_RESONANCE = 1_000;
    address public immutable director;
    mapping(bytes32 => ObjectOfPower) private objects;

    event Contained(string code, uint256 at);
    error Breach(string code);

    modifier onlyDirector() {
        require(msg.sender == director, "Solo la directora");
        _;
    }

    constructor() {
        director = msg.sender;
    }

    function contain(string calldata code) external onlyDirector returns (bool) {
        ObjectOfPower storage item = objects[keccak256(bytes(code))];
        if (item.resonance > MAX_RESONANCE) revert Breach(code);
        item.resonance = 0;
        emit Contained(code, block.timestamp);
        return true;
    }
}
