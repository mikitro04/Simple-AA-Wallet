import { buildUserOp } from "../BuildUserOp";
import { ethers } from "ethers";

async function main() {
  const ENTRY_POINT = "0x8464135c8F25Da09e49BC8782676a84730C318bC";
  // ECCO L'INDIRIZZO CORRETTO DEL TUO SMART CONTRACT:
  const SMART_ACCOUNT = "0x71C95911E9a5D330f4D621842EC243EE1343292e"; 
  const COUNTER = "0x948B3c65b89DF0B4894ABE91E6D02FE579834F8F";

  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  
  // Il Signer DEVE essere il proprietario del contratto (Account-1)
  const ownerPrivateKey = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
  const smartAccountOwner = new ethers.Wallet(ownerPrivateKey, provider);
  
  // Usiamo Account-0 solo per pagare le fee di esecuzione come Bundler
  const bundlerSigner = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);

  console.log("--- 1. Building UserOp ---");
  const tempOp = await buildUserOp({
    provider, entryPoint: ENTRY_POINT, sender: SMART_ACCOUNT, target: COUNTER, data: "0xd09de08a",
  });

  const accountGasLimits = ethers.concat([
    ethers.zeroPadValue(ethers.toBeHex(500000), 16),
    ethers.zeroPadValue(ethers.toBeHex(200000), 16)
  ]);
  const gasFees = ethers.concat([
    ethers.zeroPadValue(ethers.toBeHex(1000000000), 16),
    ethers.zeroPadValue(ethers.toBeHex(2000000000), 16)
  ]);

  const userOpV07: any = {
    sender: SMART_ACCOUNT,
    nonce: "0x" + BigInt(tempOp.nonce).toString(16),
    initCode: "0x",
    callData: tempOp.callData,
    accountGasLimits: accountGasLimits,
    preVerificationGas: "0x" + (100000n).toString(16),
    gasFees: gasFees,
    paymasterAndData: "0x",
    signature: "0x"
  };

  // Aggiunto l'errore 'FailedOp' per decodificare correttamente se fallisce
  const entryPointAbi = [
    "function getUserOpHash(tuple(address sender, uint256 nonce, bytes initCode, bytes callData, bytes32 accountGasLimits, uint256 preVerificationGas, bytes32 gasFees, bytes paymasterAndData, bytes signature) userOp) public view returns (bytes32)",
    "function handleOps(tuple(address sender, uint256 nonce, bytes initCode, bytes callData, bytes32 accountGasLimits, uint256 preVerificationGas, bytes32 gasFees, bytes paymasterAndData, bytes signature)[] ops, address beneficiary) public",
    "error FailedOp(uint256 opIndex, string reason)"
  ];

  const entryPointContract = new ethers.Contract(ENTRY_POINT, entryPointAbi, bundlerSigner);

  console.log("--- 2. Signing ---");
  const userOpHash = await entryPointContract.getUserOpHash(userOpV07);
  // Firma con il VERO proprietario
  userOpV07.signature = await smartAccountOwner.signMessage(ethers.getBytes(userOpHash));

  console.log("--- 3. Executing handleOps Directly ---");
  try {
    const tx = await entryPointContract.handleOps([userOpV07], bundlerSigner.address, {
        gasLimit: 5000000
    });
    
    console.log("🚀 SUCCESS! Transaction sent.");
    console.log("Transaction Hash:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ CONFIRMED in block:", receipt.blockNumber);

  } catch (err: any) {
    console.error("❌ Execution failed!");
    if (err.data) {
        const decodedError = entryPointContract.interface.parseError(err.data);
        if (decodedError) {
            console.error(`👉 REASON: ${decodedError.name} - ${decodedError.args}`);
        } else {
            console.error("👉 REASON (Raw Data):", err.data);
        }
    } else {
        console.error("👉 REASON:", err.reason || err.message);
    }
  }
}

main().catch(console.error);