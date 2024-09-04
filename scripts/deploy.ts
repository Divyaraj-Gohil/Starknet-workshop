import { Account, CallData, Contract, RpcProvider, stark } from "starknet";
import * as dotenv from "dotenv";
import { getCompiledCode } from "./utils";
dotenv.config();

async function main() {
  const rpcEndpoint = process.env.RPC_ENDPOINT;
  const deployerAddress = process.env.DEPLOYER_ADDRESS;
  const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;

  if (!rpcEndpoint || !deployerAddress || !deployerPrivateKey) {
    console.error("Missing required environment variables.");
    process.exit(1);
  }

  const provider = new RpcProvider({
    nodeUrl: rpcEndpoint,
  });

  // initialize existing predeployed account 0
  console.log("ACCOUNT_ADDRESS=", deployerAddress);
  console.log("ACCOUNT_PRIVATE_KEY=", deployerPrivateKey);

  const account0 = new Account(provider, deployerAddress, deployerPrivateKey);
  console.log("Account connected.\n");

  // Declare & deploy contract
  let sierraCode, casmCode;

  try {
    ({ sierraCode, casmCode } = await getCompiledCode("counter_Counter"));
  } catch (error: any) {
    console.log("Failed to read contract files:", error);
    process.exit(1);
  }

  const initialCounter = 100;  // Ensure this is a number
  const initialOwner = deployerAddress;

  if (typeof initialCounter !== 'number') {
    console.error("initial_counter should be a number");
    process.exit(1);
  }

  if (typeof initialOwner !== 'string' || !initialOwner) {
    console.error("initial_owner should be a valid non-empty string");
    process.exit(1);
  }

  const myCallData = new CallData(sierraCode.abi);
  const constructor = myCallData.compile("constructor", {
    initial_counter: BigInt(100), // Ensure u32 compatibility
    kill_switch_address: "0x05f7151ea24624e12dde7e1307f9048073196644aa54d74a9c579a257214b542",
    initial_owner: initialOwner,
  });

  const deployResponse = await account0.declareAndDeploy({
    contract: sierraCode,
    casm: casmCode,
    constructorCalldata: constructor,
    salt: stark.randomAddress(),
  });

  // Connect the new contract instance :
  const myTestContract = new Contract(
    sierraCode.abi,
    deployResponse.deploy.contract_address,
    provider
  );
  console.log(
    `✅ Contract has been deployed with the address: ${myTestContract.address}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
