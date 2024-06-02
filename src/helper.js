export const findInsuranceRate = (text) => {
  const regex = /ESTIMATE_INSURANCE:\s*\$(\d+)/i;
  const match = text.match(regex);
  console.log(match, text); 

  if (match) {
      const insurancePrice = match[1];
      console.log(`Insurance price estimate: $${insurancePrice}`);
      return insurancePrice;
  } else {
      console.log('No insurance price estimate found.');
  }
}