import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import * as LitJsSdk from '@lit-protocol/lit-node-client';
import styled from 'styled-components';

import {
  LitActionResource,
  LitAccessControlConditionResource,
  LitAbility,
  createSiweMessageWithRecaps,
  generateAuthSig,
} from '@lit-protocol/auth-helpers';
import { ABI } from './abi';
import { LitNetwork } from "@lit-protocol/constants";
import lighthouse from '@lighthouse-web3/sdk';
import extractTextFromPDF from 'pdf-parser-client-side';
import InsuranceBot from './InsuranceBot';
import './App.css';

const AppContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
`;

const Title = styled.h1`
  text-align: center;
  color: #333;
`;

const Section = styled.section`
  margin: 20px 0;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
  background-color: #f9f9f9;
`;

const SectionTitle = styled.h2`
  margin-bottom: 10px;
  color: #555;
`;

const FileInput = styled.input`
  display: block;
  margin-top: 10px;
`;

const TextInput = styled.input`
  display: block;
  margin-top: 10px;
  width: 100%;
  padding: 10px;
  box-sizing: border-box;
`;

const Button = styled.button`
  margin-top: 10px;
  padding: 10px 20px;
  background-color: #007BFF;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    background-color: #0056b3;
  }
`;

const Link = styled.a`
  color: #007BFF;
  &:hover {
    color: #0056b3;
  }
`;

const ConnectedStatus = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  justify-content: end;
`;

const GreenDot = styled.div`
  width: 10px;
  height: 10px;
  background-color: green;
  border-radius: 50%;
  margin-right: 10px;
`;

const Disclaimer = styled.p`
  margin: 20px 0;
  padding: 20px;
  background-color: #fff3cd;
  border: 1px solid #ffeeba;
  border-radius: 8px;
  color: #856404;
`;


const lighthouseUrl = 'https://gateway.lighthouse.storage/ipfs/';
const litNetwork = LitNetwork.Cayenne;

const convertFileToString = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target.result.split(',')[1]; // Extract base64 string
      resolve(result);
    };
    reader.readAsDataURL(file); // Read the file as a data URL (base64 string)
  });
};

const convertStringToFile = (fileString) => {
  if (!fileString) {
    alert('No file string to convert');
    return;
  }

  const byteCharacters = atob(fileString);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return byteArray;
}

const App = () => {
  const [currentAccount, setCurrentAccount] = useState(null);
  const [fileHash, setUploadedFileHash] = useState('');
  const [uploading, setUploading] = useState(false);
  const [decryptedText, setDecryptedText] = useState(null);
  const [connected, setConnected] = useState(false);

  const accessControlConditions = [
    {
      contractAddress: '',
      standardContractType: '',
      chain: 'ethereum',
      method: 'eth_getBalance',
      parameters: [':userAddress', 'latest'],
      returnValueTest: {
        comparator: '>=',
        value: '0',
      },
    },
  ];

  useEffect(() => {
    const connectToEthereum = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          setCurrentAccount(accounts[0]);
          setConnected(true)
        } catch (error) {
          if (error.code === 4001) {
            // User rejected request
          }
        }
      }
    };
    connectToEthereum();
  }, []);

  const getSessionSigsServer = async () => {
    const litNodeClient = new LitJsSdk.LitNodeClient({ litNetwork });
    await litNodeClient.connect();
    const latestBlockhash = await litNodeClient.getLatestBlockhash();

    const authNeededCallback = async (params) => {
      const walletWithCapacityCredit = new ethers.Wallet(
        "438c32ebeb68aa784f0cfba63b89527d7d196dca3b643dba3d4b56a47bcc7d82" // hide it later, random privatekey
      );

      const toSign = await createSiweMessageWithRecaps({
        uri: params.uri,
        expiration: params.expiration,
        resources: params.resourceAbilityRequests,
        walletAddress: walletWithCapacityCredit.address,
        nonce: latestBlockhash,
        litNodeClient,
      });

      const authSig = await generateAuthSig({
        signer: walletWithCapacityCredit,
        toSign,
      });
      return authSig;
    }
    
    const sessionSigs = await litNodeClient.getSessionSigs({
      chain: 'ethereum',
      resourceAbilityRequests: [
        {
          resource: new LitActionResource('*'),
          ability: LitAbility.LitActionExecution,
        },
        {
          resource: new LitAccessControlConditionResource('*'),
          ability: LitAbility.AccessControlConditionDecryption,
        }
      ],
      authNeededCallback,
    });
    return sessionSigs;
  }

  const uploadFile = async (fileToUpload) => {
    try {
      setUploading(true);
      const litNodeClient = new LitJsSdk.LitNodeClient({ litNetwork });
      await litNodeClient.connect();
      const sessionSigs = await getSessionSigsServer();
      const fileToString = await convertFileToString(fileToUpload[0]);

      const encryptedJSON = await LitJsSdk.encryptString({
        accessControlConditions,
        sessionSigs,
        chain: 'ethereum',
        dataToEncrypt: fileToString,
      }, litNodeClient);

      const uploadResponse = await lighthouse.uploadText(
        JSON.stringify(encryptedJSON), 
        'fabe1774.ba0551c73d244defb6167ef0035f16c5', 
        'test' + Date()
      );
      setUploadedFileHash(uploadResponse?.data?.Hash);
      setUploading(false);
    } catch (e) {
      console.log(e);
      setUploading(false);
      alert('Trouble uploading file');
    }
  };

  const createTransaction = async () => {
    const contractAddress = '0x5df12483b040e78ea02174F2C6e7487954358100';
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const basicAIAgentInstructions = `Imagine you are the insurance agent and based on form you need to provide an estimate of insurance rate per month, the price can vary from $50-$700, the reasoning doesn't need to be 100% correct but in the end I need it in the format like this ESTIMATE_INSURANCE: $XXX, make sure that ESTIMATE_INSURANCE: $XXX is always include it in the answer This is the form: `;
    const promptText = basicAIAgentInstructions + ' im 18, wth a lung sickness';

    const signer = provider.getSigner();
    const chatContract = new ethers.Contract(contractAddress, ABI, signer);
    const tx = await chatContract.startChat(promptText);

    const gasEstimate = await provider.estimateGas({
      to: contractAddress,
      data: tx.data,
    });

    const senderAddress = await signer.getAddress(); // Get the address dynamically from the signer
    const nonce = await provider.getTransactionCount(senderAddress);

    const txParams = {
      nonce: ethers.utils.hexlify(nonce),
      gasPrice: ethers.utils.hexlify(ethers.utils.parseUnits('20', 'gwei')),
      gasLimit: ethers.utils.hexlify(gasEstimate),
      to: contractAddress,
      value: ethers.utils.hexlify(0),
      data: tx.data,
      chainId: 1,
    };

    const unsignedTx = ethers.utils.serializeTransaction(txParams);
    return unsignedTx;
  };

  const decryptLitAction = async (fileToDecrypt) => {
    const fileRes = await fetch(`${lighthouseUrl}${fileToDecrypt}`).then((response) => response.json());
    const { ciphertext, dataToEncryptHash } = fileRes;

    const litNodeClient = new LitJsSdk.LitNodeClient({
      litNetwork, 
      debug: true,
    });
    await litNodeClient.connect();
    const sessionSigs = await getSessionSigsServer();

    const code = `(async () => {
      const decryptedFile = await Lit.Actions.decryptAndCombine({
        accessControlConditions,
        ciphertext,
        dataToEncryptHash,
        authSig: null,
        chain: 'ethereum',
      });
      // Lit.Actions.callContract({ txn, chain })
      Lit.Actions.setResponse({ response: decryptedFile });
    })();`;

    // const txn = await createTransaction();

    const results = await litNodeClient.executeJs({
      code,
      sessionSigs,
      jsParams: {
        accessControlConditions,
        ciphertext,
        dataToEncryptHash,
        // txn,
        // chain: 'galadrielai',
      }
    });

    const decryptedFile = results?.response;
    const blob = new Blob([convertStringToFile(decryptedFile)], { type: 'application/octet-stream' });

    extractTextFromPDF(blob).then((data) => {
      setDecryptedText(data);
    });
    return results;
  };

  
  return (
    <AppContainer>
      <Title>Insurance Bot</Title>

      <ConnectedStatus>
        {connected && <GreenDot />}
        <span>{connected ? 'Connected' : 'Not Connected'}</span>
      </ConnectedStatus>

      <Disclaimer>
        In order to use this service, you need faucets from 
        <Link href="https://faucet.litprotocol.com/" target="_blank" rel="noopener noreferrer"> Lit Faucet</Link> and 
        <Link href="https://docs.galadriel.com/faucet" target="_blank" rel="noopener noreferrer"> Galadriel Faucet</Link>.
      </Disclaimer>

      <Section>
        <SectionTitle>Upload PDF to Filecoin IPFS</SectionTitle>
        {fileHash && (
          <span>
            <p>File Uploaded, check here: </p>
            <Link href={`${lighthouseUrl}${fileHash}`} target="_blank" rel="noopener noreferrer">
              Link to Filecoin IPFS
            </Link>
          </span>
        )}
        <FileInput
          type="file"
          name="myImage"
          onChange={(event) => {
            uploadFile(event.target.files);
          }}
        />
      </Section>

      <Section>
        <SectionTitle>Fetch PDF from Filecoin IPFS & Decrypt it with Lit Actions</SectionTitle>
        <TextInput
          type="text"
          value={fileHash}
          onChange={(e) => setUploadedFileHash(e.target.value)}
          placeholder="Enter CID/Hash to decrypt"
        />
        <Button onClick={() => decryptLitAction(fileHash)}>Decrypt</Button>
      </Section>

      <Section>
        <SectionTitle>AI Insurance Agent</SectionTitle>
        {decryptedText && <InsuranceBot currentAccount={currentAccount} formText={decryptedText} />}
      </Section>
    </AppContainer>
  );
};

export default App;
