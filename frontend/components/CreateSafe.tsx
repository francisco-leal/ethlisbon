"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ADAPTER_EVENTS, SafeEventEmitterProvider } from "@web3auth/base";
import { GelatoRelayPack } from "@safe-global/relay-kit";
import { ethers } from "ethers";
import Safe, {
	EthersAdapter,
	getSafeContract,
	SafeFactory,
	predictSafeAddress,
	getProxyFactoryContract,
	encodeCreateProxyWithNonce,
	encodeSetupCallData,
	encodeMultiSendData,
	getMultiSendCallOnlyContract,
} from "@safe-global/protocol-kit";
import {
	SafeAuthKit,
	SafeAuthSignInData,
	Web3AuthModalPack,
	Web3AuthEventListener,
} from "@/utils/safe-core/index";
import { OperationType, SafeVersion } from "@safe-global/safe-core-sdk-types";
import getSafeAuth from "@/utils/safeAuth";
import { useGenericContext } from "@/contexts/GenericContext";
import { GenericCard } from "@/components/GenericCard";

const CreateSafe = () => {
	const [safeAuthSignInResponse, setSafeAuthSignInResponse] =
		useState<SafeAuthSignInData | null>(null);
	const [safeAuth, setSafeAuth] = useState<SafeAuthKit<Web3AuthModalPack>>();
	const [userAddress, setUserAddress] = useState<string | null>(null);
	const router = useRouter();

	const safeVersion: SafeVersion = "1.3.0";

	// Shared state
	const { safeAddress, setSafeAddress } = useGenericContext();

	useEffect(() => {
		(async () => {
			const safeAuthKit = await getSafeAuth();

			const response = await safeAuthKit.signIn();
			setUserAddress(response.eoa);
			setSafeAuth(safeAuthKit);
		})();
	}, []);

	const createSafe = async () => {
		const provider = new ethers.providers.Web3Provider(safeAuth.getProvider());
		const signer = provider.getSigner();

		const ethAdapter = new EthersAdapter({
			ethers,
			signerOrProvider: signer || provider,
		});

		const safeFactory = await SafeFactory.create({ ethAdapter: ethAdapter });
		console.log("Safe created");

		const safeAccountConfig = {
			owners: [await signer.getAddress()],
			threshold: 1,
		};

		const PREDETERMINED_SALT_NONCE =
			"0xb1073742015cbcf5a3a4d9d1ae33ecf619439710b89475f92e2abd2117e90f90";

		const safeDeploymentConfig = {
			saltNonce: PREDETERMINED_SALT_NONCE,
			safeVersion: safeVersion,
		};

		const safeProxyFactoryContract = await getProxyFactoryContract({
			ethAdapter,
			safeVersion,
		});

		console.log("getProxyFactoryContract: ", safeProxyFactoryContract);

		const safeAddress = await predictSafeAddress({
			ethAdapter: ethAdapter,
			safeAccountConfig,
			safeDeploymentConfig,
		});

		console.log("predictSafeAddres: ", safeAddress);

		const safeContract = await getSafeContract({
			ethAdapter: ethAdapter,
			safeVersion: safeVersion,
		});

		console.log("getSafeContract: ", safeContract);

		const relayPack = new GelatoRelayPack(
			"JcpsXW8SvuPmeHlMEwVgvW_JjzMiF8L72Qj17PQQ944_"
		);

		const initializer = await encodeSetupCallData({
			ethAdapter: ethAdapter,
			safeContract: safeContract,
			safeAccountConfig: safeAccountConfig,
		});

		console.log("encodeSetupCallData: ", initializer);

		const safeDeploymentTransaction = {
			to: safeProxyFactoryContract.getAddress(),
			value: "0",
			data: encodeCreateProxyWithNonce(
				safeProxyFactoryContract,
				safeContract.getAddress(),
				initializer
			),
			operation: OperationType.Call,
		};

		console.log(
			"safeDeploymentTransaction.encode: ",
			safeDeploymentTransaction
		);

		const multiSendData = encodeMultiSendData([safeDeploymentTransaction]);
		console.log("multiSendData: ", multiSendData);

		const multiSendCallOnlyContract = await getMultiSendCallOnlyContract({
			ethAdapter: ethAdapter,
			safeVersion,
		});
		console.log("multiSendCallOnlyContract: ", multiSendCallOnlyContract);

		const encodedTransaction = multiSendCallOnlyContract.encode("multiSend", [
			multiSendData,
		]);
		console.log("encodedTransaction: ", encodedTransaction);

		const chainId = await ethAdapter.getChainId();
		const relayTransaction = {
			target: await safeContract.getAddress(),
			encodedTransaction: encodedTransaction,
			chainId,
			options: {
				gasLimit: "100000",
				isSponsored: true,
			},
		};
		const response1 = await relayPack.relayTransaction(relayTransaction);
		console.log(
			`Relay Transaction Task ID: https://relay.gelato.digital/tasks/status/${response1.taskId}`
		);

		setSafeAddress(safeAddress);
		router.push("/contacts");
	};
	return (
    <div className="flex flex-col items-center min-h-screen py-2">
      <main className="flex flex-col items-center flex-1 px-20 text-center">
        <Image src={"/logo.svg"} width={600} height={200} className={"-mb-20"} alt="logo"/>
				<div className="flex items-center justify-center text-center mt-3">
					<GenericCard
						className={""}
						title={"Create Safe to receive funds"}
						subtitle={""}
						footerText={"Create Safe"}
						footerClick={() => createSafe()}
					>
						<div>
							<p>Foo</p>
						</div>
					</GenericCard>
				</div>
			</main>
		</div>
	);
};

export default CreateSafe;
