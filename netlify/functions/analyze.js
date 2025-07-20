const fetch = require('node-fetch');

// WAARSCHUWING: Hardcoded API key is NIET veilig! Alleen tijdelijk gebruiken voor debuggen.
const HARDCODED_API_KEY = "sk-ant-api03--v3Wf5CwsuzIKk2fNAf9KKU7wH5D2LI3sB0b0fjova6whpsLUd5-jPqld11bi2BFETOg_u_5-2jC6K17y7Db9w-qd8phQAA";

exports.handler = async function(event, context) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY || HARDCODED_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Claude API key ontbreekt in environment variables EN fallback.' })
      };
    }

    const { company, tenders } = JSON.parse(event.body);

    // Bouw de prompt als string
    const prompt = `Je bent een expert in het analyseren van Nederlandse overheidstenders. Analyseer de volgende tenders voor dit bedrijf en geef een gestructureerde analyse.\n\nBedrijfsprofiel:\n${company}\n\nTenders (JSON):\n${JSON.stringify(tenders)}\n\nGeef je antwoord in het volgende JSON formaat. Gebruik ALLE beschikbare data uit de tender JSON, inclusief contact info, deadlines, CPV codes, etc:\n{ ... }\n\nBELANGRIJK: \n- Gebruik ALLE beschikbare velden uit de tender data\n- Extract contact informatie uit details__block_email, details__block_telefoon, details__block_contactpersoon\n- Haal waardes uit publicatie__table velden\n- Antwoord ALLEEN met valide JSON, geen andere tekst.`;

    const claudeBody = {
      model: "claude-3-sonnet-20240229",
      max_tokens: 3000,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    };

    // Log de body voor debuggen
    console.log("Claude API request body:", JSON.stringify(claudeBody));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(claudeBody)
    });

    const text = await response.text();
    // Log de response voor debuggen
    console.log("Claude API response status:", response.status);
    console.log("Claude API response body:", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = { error: 'Response is not valid JSON', raw: text };
    }

    if (!response.ok) {
      // Probeer foutmelding uit Claude API netjes door te geven
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: data.error || data.raw || text })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };
  } catch (err) {
    console.log("Function error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
}; 