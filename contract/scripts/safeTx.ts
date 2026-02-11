import { createSafeClient, SafeClient } from '@safe-global/sdk-starter-kit';
import { Interface, Transaction, TransactionReceipt, ethers } from 'ethers';

export async function safeTx(
	signerPrivateKey: string,
	safeAddress: string,
	data: {
			to: string, 
			data: any,
			value?: string
	}[],
	gasPrice?: string,
	gasLimit?: string,
	txServiceUrl?: string,
): Promise<{
    status: boolean,
    tx: ethers.TransactionResponse,
    txHash: string,
    receipt: TransactionReceipt
}> {

	const clientConfig: any = {
		provider: String(process.env.RPC_URL),
		signer: String(signerPrivateKey),
		safeAddress: String(safeAddress) // safeAddress
	}

	if (txServiceUrl) {
		clientConfig.txServiceUrl = txServiceUrl
	}

	const safeClient = await createSafeClient(clientConfig)
    
	const txs = []
	const nonce = await safeClient.getNonce()
	for (const [index, item] of data.entries()) {
		if (item.to === "0x0000000000000000000000000000000000000000") {
			throw new Error("Zero address is not allowed for safeTx.")
		}
		txs.push({
			to: item.to,
			data: item.data,
			value: item.value ?? "0",
			nonce: nonce + index
		})
	}

	const txResult = await safeClient.send({ 
        transactions: txs, 
        ...(gasPrice && { gasPrice: gasPrice }),
				...(gasLimit && { gasLimit: gasLimit })
    })
	
	const txHash = txResult.transactions?.ethereumTxHash

	const provider = new ethers.JsonRpcProvider(process.env.RPC_URL)
	const tx = await provider.getTransaction(String(txHash))
	// const receipt = await provider.waitForTransaction(String(txHash));

	return {
		status: String(txResult.status) === "EXECUTED",
		tx: tx as any,
		txHash: txHash as any,
		// receipt: receipt as any
		receipt: null as any
 	}
}
