// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface ISwapRouter02 {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external returns (uint256 amountOut);
}

contract EarthSwapRouter is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    error ZeroAddress();
    error FeeTooHigh(uint256 attemptedFeeBps, uint256 maxFeeBps);
    error DeadlineExpired(uint256 deadline, uint256 currentTimestamp);
    error IdenticalTokens();
    error InvalidAmountIn();
    error NotTreasury(address caller, address expectedTreasury);
    error CannotRescueAccruedFees();

    /// @notice Arc mainnet chain ID.
    uint256 public constant ARC_MAINNET_CHAIN_ID = 5042;

    /// @notice Arc mainnet USDC (ERC-20 interface) address.
    address public constant ARC_USDC = 0x3600000000000000000000000000000000000000;

    /// @notice Basis-points denominator for fee calculations.
    uint256 public constant BPS_DENOMINATOR = 10_000;

    /// @notice Maximum protocol fee in basis points (0.5%).
    uint256 public constant MAX_FEE_BPS = 50;

    /// @notice Default protocol fee in basis points (0.15%).
    uint256 public constant DEFAULT_FEE_BPS = 15;

    /// @notice Treasury that can withdraw accrued protocol fees.
    address public treasury;

    /// @notice Uniswap v3 SwapRouter02 used for execution.
    address public immutable swapRouter;

    /// @notice Protocol fee in basis points deducted from swap input.
    uint256 public feeBps;

    /// @notice Accrued protocol fees by input token.
    mapping(address => uint256) public accruedFees;

    struct SwapParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        uint256 amountIn;
        /// @notice Minimum output for the net post-fee input amount forwarded to Uniswap.
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
        uint256 deadline;
        address recipient;
    }

    event Swap(
        address indexed user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 feeAmount,
        uint256 amountOut
    );
    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event TreasuryUpdated(address oldTreasury, address newTreasury);

    /// @notice Creates a fee-collecting swap router for Arc mainnet.
    /// @param _treasury Address that can withdraw protocol fees.
    /// @param _swapRouter Uniswap v3 SwapRouter02 address.
    /// @param _owner Owner account with admin permissions.
    constructor(address _treasury, address _swapRouter, address _owner) Ownable(_owner) {
        if (_treasury == address(0) || _swapRouter == address(0) || _owner == address(0)) {
            revert ZeroAddress();
        }

        treasury = _treasury;
        swapRouter = _swapRouter;
        feeBps = DEFAULT_FEE_BPS;
    }

    /// @notice Swaps an exact ERC-20 input amount through Uniswap v3 after collecting protocol fee.
    /// @dev Deducts fee from actual amount received, accrues it, forwards net input to SwapRouter02, and resets allowance afterward.
    /// @param params Swap configuration and limits.
    /// @return amountOut Actual amount of `tokenOut` received from Uniswap v3.
    function swapExactInputSingle(SwapParams calldata params) external nonReentrant returns (uint256 amountOut) {
        if (params.deadline < block.timestamp) {
            revert DeadlineExpired(params.deadline, block.timestamp);
        }
        if (params.tokenIn == params.tokenOut) {
            revert IdenticalTokens();
        }
        if (params.amountIn == 0) {
            revert InvalidAmountIn();
        }

        IERC20 tokenIn = IERC20(params.tokenIn);

        uint256 balanceBefore = tokenIn.balanceOf(address(this));
        tokenIn.safeTransferFrom(msg.sender, address(this), params.amountIn);
        uint256 received = tokenIn.balanceOf(address(this)) - balanceBefore;

        uint256 feeAmount = (received * feeBps) / BPS_DENOMINATOR;
        uint256 netAmountIn = received - feeAmount;

        if (feeAmount > 0) {
            accruedFees[params.tokenIn] += feeAmount;
        }

        tokenIn.forceApprove(swapRouter, 0);
        tokenIn.forceApprove(swapRouter, netAmountIn);

        amountOut = ISwapRouter02(swapRouter).exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: params.tokenIn,
                tokenOut: params.tokenOut,
                fee: params.fee,
                recipient: params.recipient,
                deadline: params.deadline,
                amountIn: netAmountIn,
                amountOutMinimum: params.amountOutMinimum,
                sqrtPriceLimitX96: params.sqrtPriceLimitX96
            })
        );

        tokenIn.forceApprove(swapRouter, 0);

        emit Swap(msg.sender, params.tokenIn, params.tokenOut, received, feeAmount, amountOut);
    }

    /// @notice Withdraws all accrued protocol fees for a token to the treasury.
    /// @param token Token address whose accrued fees will be withdrawn.
    function withdrawFees(address token) external {
        if (msg.sender != treasury) {
            revert NotTreasury(msg.sender, treasury);
        }

        uint256 amount = accruedFees[token];
        accruedFees[token] = 0;
        IERC20(token).safeTransfer(treasury, amount);
    }

    /// @notice Updates the protocol fee in basis points. Maximum is 0.5% (50 bps).
    /// @param _feeBps New fee value in basis points.
    function setFeeBps(uint256 _feeBps) external onlyOwner {
        if (_feeBps > MAX_FEE_BPS) {
            revert FeeTooHigh(_feeBps, MAX_FEE_BPS);
        }

        uint256 oldFee = feeBps;
        feeBps = _feeBps;

        emit FeeUpdated(oldFee, _feeBps);
    }

    /// @notice Updates the treasury address that receives protocol fees.
    /// @param _treasury New treasury address.
    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) {
            revert ZeroAddress();
        }

        address oldTreasury = treasury;
        treasury = _treasury;

        emit TreasuryUpdated(oldTreasury, _treasury);
    }

    /// @notice Recovers ERC-20 tokens that are accidentally left in this contract.
    /// @param token ERC-20 token to rescue.
    /// @param amount Token amount to recover.
    function rescueTokens(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            revert ZeroAddress();
        }

        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance < amount || (balance - amount) < accruedFees[token]) {
            revert CannotRescueAccruedFees();
        }

        IERC20(token).safeTransfer(owner(), amount);
    }
}
