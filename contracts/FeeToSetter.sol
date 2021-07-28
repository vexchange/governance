pragma solidity ^0.5.16;

// this contract serves as feeToSetter, allowing owner to manage fees in the context of a specific feeTo implementation
contract FeeToSetter {
    // immutables
    address public factory;
    uint public vestingEnd;
    address public feeTo;

    address public owner;

    constructor(address factory_, uint vestingEnd_, address owner_, address feeTo_) public {
        require(vestingEnd_ > block.timestamp, 'FeeToSetter::constructor: vesting must end after deployment');
        factory = factory_;
        vestingEnd = vestingEnd_;
        owner = owner_;
        feeTo = feeTo_;
    }

    // allows owner to change itself at any time
    function setOwner(address owner_) public {
        require(msg.sender == owner, 'FeeToSetter::setOwner: not allowed');
        owner = owner_;
    }

    // allows owner to change feeToSetter after vesting
    function setFactoryOwner(address feeToSetter_) public {
        require(block.timestamp >= vestingEnd, 'FeeToSetter::setFactoryOwner: not time yet');
        require(msg.sender == owner, 'FeeToSetter::setFactoryOwner: not allowed');
        IVexchangeV2Factory(factory).transferOwnership(feeToSetter_);
    }

    // allows owner to adjust fees after vesting
    function setDefaultPlatformFee(uint platformFee_) public {
        require(block.timestamp >= vestingEnd, 'FeeToSetter::setDefaultPlatformFee: not time yet');
        require(msg.sender == owner, 'FeeToSetter::setDefaultPlatformFee: not allowed');

        IVexchangeV2Factory(factory).setDefaultPlatformFee(platformFee_); 
    }

    function setPlatformFeeTo() public {
        require(block.timestamp >= vestingEnd, 'FeeToSetter::setPlatformFeeTo: not time yet');
        require(msg.sender == owner, 'FeeToSetter::setPlatformFeeTo: not allowed');
        IVexchangeV2Factory(factory).setPlatformFeeTo(feeTo);   
    }
}

interface IVexchangeV2Factory {
    function transferOwnership(address) external;
    function setPlatformFeeTo(address) external;
    function setDefaultPlatformFee(uint) external;
}
