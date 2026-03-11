import { buildUserOp } from "../BuildUserOp";
import { ethers } from "ethers";

async function main() {
  const ENTRY_POINT = "0x8464135c8F25Da09e49BC8782676a84730C318bC";
  const SMART_ACCOUNT = "0x71C95911E9a5D330f4D621842EC243EE1343292e";
  const COUNTER = "0x948B3c65b89DF0B4894ABE91E6D02FE579834F8F";

  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

  console.log("--- 1️⃣ Build UserOperation only ---");
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
    sender: SMART_ACCOUNT, nonce: "0x" + BigInt(tempOp.nonce).toString(16), initCode: "0x",
    callData: tempOp.callData, accountGasLimits, preVerificationGas: "0x" + (100000n).toString(16),
    gasFees, paymasterAndData: "0x", signature: "0x"
  };

  console.log("PackedUserOp build (Unsigned):", userOpV07);
}

main().catch(console.error);