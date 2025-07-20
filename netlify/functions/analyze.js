const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  try {
    const { company, tenders } = JSON.parse(event.body);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 3000,
        messages: [
          {
            role: "user",
            content: `Je bent een expert in het analyseren van Nederlandse overheidstenders. Analyseer de volgende tenders voor dit bedrijf en geef een gestructureerde analyse.\n\nBedrijfsprofiel:\n${company}\n\nTenders (JSON):\n${JSON.stringify(tenders)}\n\nGeef je antwoord in het volgende JSON formaat. Gebruik ALLE beschikbare data uit de tender JSON, inclusief contact info, deadlines, CPV codes, etc:\n{ ... }\n\nBELANGRIJK: \n- Gebruik ALLE beschikbare velden uit de tender data\n- Extract contact informatie uit details__block_email, details__block_telefoon, details__block_contactpersoon\n- Haal waardes uit publicatie__table velden\n- Antwoord ALLEEN met valide JSON, geen andere tekst.`
          }
        ]
      })
    });

    const data = await response.json();
    return {
      statusCode: response.status,
      body: JSON.stringify(data)
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
}; 