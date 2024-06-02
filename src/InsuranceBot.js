import { useState } from 'react';
import { ethers } from 'ethers'; // Correct import statement
import { ABI } from './abi'; // Ensure ABI is correctly imported
import { findInsuranceRate } from './helper'; // Ensure helper functions are correctly imported

const InsuranceBot = ({ formText }) => {
  const [chatId, saveChatId] = useState(1);
  const [insuranceRate, setInsuranceRate] = useState(null);
  const [aiEvaluation, setAIEvaluation] = useState('');
  const contractAddress = '0x5df12483b040e78ea02174F2C6e7487954358100';
  const provider = new ethers.providers.Web3Provider(window.ethereum); // Correct provider initialization

  const createInsuranceEvaluation = async () => {
    const basicAIAgentInstructions = `Imagine you are the insurance agent and based on form you need to provide an estimate of insurance rate per month, the price can vary from $50-$700, the reasoning doesn't need to be 100% correct but in the end I need it in the format like this ESTIMATE_INSURANCE: $XXX, make sure that ESTIMATE_INSURANCE: $XXX is always included in the answer This is the form: `;
    const promptText = basicAIAgentInstructions + formText;

    const signer = provider.getSigner(); // Get signer from provider
    const chatContract = new ethers.Contract(contractAddress, ABI, signer); // Correct contract initialization
    const tx = await chatContract.startChat(promptText);
    const receipt = await tx.wait();

    const iface = new ethers.utils.Interface(ABI); // Correct interface initialization
    const log = receipt.logs[1];

    try {
      const parsedLog = iface.parseLog(log);
      if (parsedLog.name === 'ChatCreated') {
        saveChatId(parsedLog.args[1].toString());
      }
    } catch (error) {
      console.log('Error parsing log:', error);
    }

    const res = await chatContract.getMessageHistoryContents(chatId);
    const evaluation = res[1];
    setAIEvaluation(evaluation);
    const rate = findInsuranceRate(evaluation);
    setInsuranceRate(rate);
  };

  if (!insuranceRate) {
    return <button onClick={createInsuranceEvaluation}>Request Form Evaluation</button>;
  }

  return (
    <div>
      <h2>Insurance RATE $ {insuranceRate}</h2>
      <div>{aiEvaluation}</div>
    </div>
  );
};

export default InsuranceBot;
