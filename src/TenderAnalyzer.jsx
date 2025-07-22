import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "./components/ui/card";

import {
  Alert,
  AlertDescription
} from "./components/ui/alert";


import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, PieChart, Pie, Cell } from 'recharts';
import { Building2, TrendingUp, AlertCircle, CheckCircle, Clock, Euro, MapPin, Tag, Brain, Upload, Loader2, ChevronDown, ChevronUp, ExternalLink, Mail, Phone, FileText, Calendar, Users, Briefcase, Target, Award, BarChart3, Info, Copy, Check } from 'lucide-react';

const TenderAnalyzer = () => {
  const [companyProfile, setCompanyProfile] = useState('');
  const [tenderData, setTenderData] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedTenders, setExpandedTenders] = useState({});
  const [copiedEmails, setCopiedEmails] = useState({});
  const [selectedView, setSelectedView] = useState('grid');
  const [filterPriority, setFilterPriority] = useState('all');

  const analyzeWithClaude = async (company, tenders) => {
    try {
      // Parse tender data if it's a string
      let parsedTenders = typeof tenders === 'string' ? JSON.parse(tenders) : tenders;
      
      // Aggressively compress data - only keep absolutely essential fields
      const compressedTenders = parsedTenders.map(tender => {
        // Extract description - truncate if too long
        let description = tender.details__block_omschrijving || 
                         tender.publicatie__table_0_procedure_beschrijving || 
                         "Geen beschrijving";
        
        // Truncate description to first 500 characters if longer
        if (description.length > 500) {
          description = description.substring(0, 497) + "...";
        }
        
        return {
          title: tender.title ? tender.title.substring(0, 100) : "Geen titel",
          url: tender.url,
          authority: tender.contracting_authority ? tender.contracting_authority.substring(0, 50) : "Onbekend",
          deadline: tender.deadline || "Geen deadline",
          desc: description,
          value: tender.publicatie__table_0_waarde_geraamde_waarde_exclusief_btw || 
                 tender.details__block_waarde || 
                 "N/A",
          cpv: tender.details__block_hoofdopdracht_cpvcode ? 
               tender.details__block_hoofdopdracht_cpvcode.substring(0, 30) : "N/A",
          type: tender.details__block_procedure || "Openbaar",
          loc: tender.publicatie__table_0_plaats_van_uitvoering_aanvullende_informatie || 
               tender.details__block_plaats_van_uitvoering_nutscode || 
               "NL"
        };
      });
      
      // For Opus with high limits, we can handle MANY more tenders
      const limitedTenders = compressedTenders.slice(0, 100);
      
      console.log(`Analyzing ${limitedTenders.length} tenders (compressed from ${parsedTenders.length})`);
      console.log(`Data size: ~${JSON.stringify(limitedTenders).length} characters`);
      
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-opus-4-20250514",
          max_tokens: 8192,
          messages: [
            {
              role: "user",
              content: `Analyseer deze ${limitedTenders.length} tenders voor het bedrijf. Geef een beknopte analyse.

Bedrijf: ${company}

Tenders:
${JSON.stringify(limitedTenders)}

Geef een uitgebreide, gedetailleerde JSON analyse met deze structuur:
{
  "tenderAnalysis": [
    {
      "tenderId": "tender title",
      "matchScore": 85,
      "reasoning": "Uitgebreide analyse waarom deze tender past",
      "pros": ["voordeel 1", "voordeel 2", "voordeel 3"],
      "cons": ["nadeel 1", "nadeel 2"],
      "actionability": "high/medium/low",
      "deadline": "datum",
      "estimatedValue": "waarde",
      "competitionLevel": "high/medium/low",
      "tenderUrl": "url",
      "contractingAuthority": "naam",
      "requiredCapabilities": ["vereiste 1", "vereiste 2"],
      "missingCapabilities": ["ontbreekt 1", "ontbreekt 2"],
      "strategicAdvice": "Specifiek advies voor deze tender",
      "winProbability": "high/medium/low"
    }
  ],
  "summary": {
    "totalOpportunities": 30,
    "highPriorityCount": 10,
    "averageMatchScore": 72,
    "topSectors": ["sector1", "sector2", "sector3"],
    "nearestDeadline": "datum",
    "totalEstimatedValue": "€X miljoen",
    "keyStrengths": ["sterkte 1", "sterkte 2"],
    "improvementAreas": ["verbetering 1", "verbetering 2"]
  },
  "recommendations": [
    {
      "priority": "high",
      "action": "Gedetailleerde actie beschrijving",
      "deadline": "datum",
      "relatedTender": "tender naam",
      "estimatedEffort": "X dagen"
    }
  ],
  "sectorAnalysis": [
    {"sector": "IT", "percentage": 40, "opportunities": 12},
    {"sector": "Software", "percentage": 30, "opportunities": 9},
    {"sector": "Consulting", "percentage": 30, "opportunities": 9}
  ]
}

Geef een gedetailleerde, uitgebreide analyse. Gebruik de volledige capaciteit van Claude Opus 4. Antwoord met valide JSON.`
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("API Response Error:", errorData);
        
        // Check for specific error types
        if (response.status === 400 && errorData.includes("too many tokens")) {
          throw new Error("Te veel data - probeer met minder tenders of een kortere bedrijfsomschrijving");
        } else if (response.status === 429) {
          throw new Error("Rate limit bereikt - probeer het over een minuut opnieuw");
        } else if (response.status === 401) {
          throw new Error("Authenticatie fout - geen geldige API toegang");
        } else {
          throw new Error(`API fout (${response.status}): ${errorData.substring(0, 100)}...`);
        }
      }

      const data = await response.json();
      let responseText = data.content[0].text;
      responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      
      const parsedResponse = JSON.parse(responseText);
      
      // Enrich the response with full tender data for display
      const enrichedResponse = {
        ...parsedResponse,
        tenderAnalysis: parsedResponse.tenderAnalysis.map((analysis, idx) => {
          const originalTender = parsedTenders.find(t => 
            t.title.includes(analysis.tenderId) || 
            analysis.tenderId.includes(t.title.substring(0, 30))
          ) || parsedTenders[idx];
          
          return {
            ...analysis,
            // Add back full contact details from original data
            contactPerson: originalTender?.publicatie__table_0_org0001_contactpunt || 
                          originalTender?.details__block_contactpersoon || "",
            contactEmail: originalTender?.publicatie__table_0_org0001_email || 
                         originalTender?.details__block_email || "",
            contactPhone: originalTender?.publicatie__table_0_org0001_telefoon || 
                         originalTender?.details__block_telefoon || "",
            cpvCodes: [originalTender?.details__block_hoofdopdracht_cpvcode || ""],
            procedure: originalTender?.details__block_procedure || analysis.procedure || "",
            referenceNumber: originalTender?.details__block_referentienummer || "",
            location: originalTender?.publicatie__table_0_plaats_van_uitvoering_aanvullende_informatie || 
                     originalTender?.details__block_plaats_van_uitvoering_nutscode || "Nederland",
            duration: originalTender?.publicatie__table_0_geraamde_duur_looptijd || "",
            // Add extra fields from Opus response
            strategicAdvice: analysis.strategicAdvice || "",
            winProbability: analysis.winProbability || "medium",
            // Keep arrays or use from response
            requiredCapabilities: analysis.requiredCapabilities || [],
            missingCapabilities: analysis.missingCapabilities || [],
            publicationDate: "",
            documentsUrl: ""
          };
        })
      };
      
      return enrichedResponse;
    } catch (err) {
      console.error("Claude API Error:", err);
      
      // Provide more specific error messages
      if (err.message.includes("JSON")) {
        throw new Error("Fout bij verwerken van tender data - controleer JSON formaat");
      } else if (err.message.includes("Te veel data")) {
        throw new Error(err.message + " (Tip: gebruik maximaal 300 tekens voor bedrijfsprofiel)");
      } else {
        throw new Error("Analyse mislukt: " + err.message);
      }
    }
  };

  const handleAnalyze = async () => {
    if (!companyProfile || !tenderData) {
      setError('Vul beide velden in voordat je analyseert');
      return;
    }

    // Check total input size
    const totalInputSize = companyProfile.length + tenderData.length;
    if (totalInputSize > 200000) {
      setError(`Te veel data (${totalInputSize.toLocaleString('nl-NL')} tekens). Maximum is 200.000 tekens totaal.`);
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const result = await analyzeWithClaude(companyProfile, tenderData);
      setAnalysis(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleTenderExpansion = (index) => {
    setExpandedTenders(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const copyToClipboard = async (text, tenderId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedEmails(prev => ({ ...prev, [tenderId]: true }));
      setTimeout(() => {
        setCopiedEmails(prev => ({ ...prev, [tenderId]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getMatchColor = (score) => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getMatchGradient = (score) => {
    if (score >= 80) return 'from-green-500 to-green-600';
    if (score >= 60) return 'from-amber-500 to-amber-600';
    return 'from-red-500 to-red-600';
  };

  const radarData = analysis?.tenderAnalysis?.slice(0, 5).map(tender => ({
    tender: tender.tenderId.substring(0, 20) + '...',
    match: tender.matchScore,
  })) || [];

  const pieColors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

  const filteredTenders = analysis?.tenderAnalysis?.filter(tender => {
    if (filterPriority === 'all') return true;
    return tender.actionability === filterPriority;
  }) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-2 flex items-center justify-center gap-3">
            <Brain className="w-10 h-10 text-blue-600" />
            TenderNed AI Analyzer
          </h1>
          <p className="text-slate-600">Intelligente tender matching met AI-powered analyse</p>
        </div>

        {/* Input Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Bedrijfsprofiel
              </CardTitle>
              <CardDescription>
                Beschrijf kort wat je bedrijf doet (max 300 tekens voor beste resultaten)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                className="w-full h-40 p-4 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Bijvoorbeeld: Wij zijn een IT consultancy bedrijf gespecialiseerd in cloud oplossingen, Azure, AWS, Office365, met 50+ medewerkers..."
                value={companyProfile}
                onChange={(e) => setCompanyProfile(e.target.value)}
                maxLength={1000}
              />
              <p className="text-sm text-slate-500 mt-2">
                {companyProfile.length}/1.000 tekens
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Tender Data (JSON)
              </CardTitle>
              <CardDescription>
                Plak de JSON output van je TenderNed scraper (max 100 tenders)
                <br />
                <span className="text-xs text-slate-500">💡 Pro tip: Minify je JSON om tot 150+ tenders te analyseren!</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                className="w-full h-40 p-4 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                placeholder='[{"title": "...", "contracting_authority": "...", ...}]'
                value={tenderData}
                onChange={(e) => setTenderData(e.target.value)}
                maxLength={200000}
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-sm text-slate-500">
                  {(() => {
                    try {
                      const parsed = JSON.parse(tenderData);
                      return `${Array.isArray(parsed) ? parsed.length : 0} tenders gevonden`;
                    } catch {
                      return tenderData ? 'Ongeldige JSON' : '';
                    }
                  })()}
                </p>
                <p className="text-sm text-slate-500">
                  {tenderData.length.toLocaleString('nl-NL')}/200.000 tekens
                </p>
              </div>
              {tenderData.length > 180000 && (
                <Alert className="mt-2 border-amber-200 bg-amber-50">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800 text-sm">
                    Je nadert de limiet. Minify je JSON voor optimaal gebruik!
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Analyze Button */}
        <div className="text-center mb-8">
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyseren...
              </>
            ) : (
              <>
                <Brain className="w-5 h-5" />
                Analyseer Tenders
              </>
            )}
          </button>
        </div>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {analysis && (
          <>
            {/* Enhanced Summary Dashboard */}
            <div className="grid md:grid-cols-4 gap-4 mb-8">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white transform hover:scale-105 transition-transform cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100">Totaal Kansen</p>
                      <p className="text-3xl font-bold">{analysis.summary.totalOpportunities}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-blue-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white transform hover:scale-105 transition-transform cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100">Hoge Prioriteit</p>
                      <p className="text-3xl font-bold">{analysis.summary.highPriorityCount}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white transform hover:scale-105 transition-transform cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-amber-100">Gem. Match Score</p>
                      <p className="text-3xl font-bold">{analysis.summary.averageMatchScore}%</p>
                    </div>
                    <Award className="w-8 h-8 text-amber-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white transform hover:scale-105 transition-transform cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100">Totale Waarde</p>
                      <p className="text-xl font-bold">{analysis.summary.totalEstimatedValue || '€ N/A'}</p>
                    </div>
                    <Euro className="w-8 h-8 text-purple-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Section */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Radar Chart */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    Match Score Overzicht
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="tender" tick={{ fontSize: 12 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} />
                      <Radar name="Match Score" dataKey="match" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Sector Distribution */}
              {analysis.sectorAnalysis && (
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-purple-600" />
                      Sector Verdeling
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={analysis.sectorAnalysis}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.sector} (${entry.percentage}%)`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="percentage"
                        >
                          {analysis.sectorAnalysis.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Filter and View Controls */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterPriority('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterPriority === 'all' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Alle ({analysis.tenderAnalysis.length})
                </button>
                <button
                  onClick={() => setFilterPriority('high')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterPriority === 'high' 
                      ? 'bg-green-600 text-white' 
                      : 'bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Hoog ({analysis.tenderAnalysis.filter(t => t.actionability === 'high').length})
                </button>
                <button
                  onClick={() => setFilterPriority('medium')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterPriority === 'medium' 
                      ? 'bg-amber-600 text-white' 
                      : 'bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Medium ({analysis.tenderAnalysis.filter(t => t.actionability === 'medium').length})
                </button>
                <button
                  onClick={() => setFilterPriority('low')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterPriority === 'low' 
                      ? 'bg-gray-600 text-white' 
                      : 'bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Laag ({analysis.tenderAnalysis.filter(t => t.actionability === 'low').length})
                </button>
              </div>
            </div>

            {/* Enhanced Tender Cards */}
            <div className="space-y-6 mb-8">
              <h2 className="text-2xl font-bold text-slate-900">Gedetailleerde Tender Analyse</h2>
              {filteredTenders.map((tender, index) => (
                <Card key={index} className="shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardHeader className="cursor-pointer" onClick={() => toggleTenderExpansion(index)}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {tender.tenderId}
                          {tender.tenderUrl && (
                            <a 
                              href={tender.tenderUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </CardTitle>
                        <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-600">
                          {tender.contractingAuthority && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-4 h-4" />
                              {tender.contractingAuthority}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {tender.deadline}
                          </span>
                          {tender.estimatedValue && (
                            <span className="flex items-center gap-1">
                              <Euro className="w-4 h-4" />
                              {tender.estimatedValue}
                            </span>
                          )}
                          {tender.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {tender.location}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className={`relative w-20 h-20 rounded-full bg-gradient-to-br ${getMatchGradient(tender.matchScore)} p-1`}>
                            <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                              <span className="text-2xl font-bold" style={{ color: getMatchColor(tender.matchScore) }}>
                                {tender.matchScore}%
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">Match Score</p>
                        </div>
                        <div className="text-slate-400">
                          {expandedTenders[index] ? <ChevronUp /> : <ChevronDown />}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-4">
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <p className="font-semibold text-slate-700 mb-1">Waarom deze tender?</p>
                        <p className="text-slate-600">{tender.reasoning}</p>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <p className="font-semibold text-green-700 mb-2">✅ Voordelen</p>
                          <ul className="space-y-1">
                            {tender.pros.map((pro, i) => (
                              <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                                <span className="text-green-500 mt-0.5">•</span>
                                {pro}
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <p className="font-semibold text-red-700 mb-2">⚠️ Aandachtspunten</p>
                          <ul className="space-y-1">
                            {tender.cons.map((con, i) => (
                              <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                                <span className="text-red-500 mt-0.5">•</span>
                                {con}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-4 border-t">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          tender.actionability === 'high' ? 'bg-green-100 text-green-800' :
                          tender.actionability === 'medium' ? 'bg-amber-100 text-amber-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {tender.actionability === 'high' ? 'Hoge prioriteit' :
                           tender.actionability === 'medium' ? 'Medium prioriteit' : 'Lage prioriteit'}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          tender.competitionLevel === 'high' ? 'bg-red-100 text-red-800' :
                          tender.competitionLevel === 'medium' ? 'bg-amber-100 text-amber-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          Competitie: {tender.competitionLevel === 'high' ? 'Hoog' :
                                      tender.competitionLevel === 'medium' ? 'Gemiddeld' : 'Laag'}
                        </span>
                        {tender.procedure && (
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            {tender.procedure}
                          </span>
                        )}
                      </div>

                      {/* Expandable Details Section */}
                      {expandedTenders[index] && (
                        <div className="mt-6 space-y-4 animate-in slide-in-from-top duration-300">
                          <div className="border-t pt-4">
                            <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                              <Info className="w-5 h-5 text-blue-600" />
                              Gedetailleerde Informatie
                            </h4>
                            
                            <div className="grid md:grid-cols-2 gap-4">
                              {/* Contact Information */}
                              <div className="bg-blue-50 p-4 rounded-lg">
                                <h5 className="font-semibold text-blue-900 mb-2">Contact Informatie</h5>
                                <div className="space-y-2">
                                  {tender.contactPerson && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Users className="w-4 h-4 text-blue-600" />
                                      <span>{tender.contactPerson}</span>
                                    </div>
                                  )}
                                  {tender.contactEmail && (
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2 text-sm">
                                        <Mail className="w-4 h-4 text-blue-600" />
                                        <a href={`mailto:${tender.contactEmail}`} className="text-blue-600 hover:underline">
                                          {tender.contactEmail}
                                        </a>
                                      </div>
                                      <button
                                        onClick={() => copyToClipboard(tender.contactEmail, tender.tenderId)}
                                        className="text-blue-600 hover:text-blue-800 p-1"
                                      >
                                        {copiedEmails[tender.tenderId] ? 
                                          <Check className="w-4 h-4" /> : 
                                          <Copy className="w-4 h-4" />
                                        }
                                      </button>
                                    </div>
                                  )}
                                  {tender.contactPhone && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Phone className="w-4 h-4 text-blue-600" />
                                      <a href={`tel:${tender.contactPhone}`} className="text-blue-600 hover:underline">
                                        {tender.contactPhone}
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Technical Details */}
                              <div className="bg-purple-50 p-4 rounded-lg">
                                <h5 className="font-semibold text-purple-900 mb-2">Technische Details</h5>
                                <div className="space-y-2 text-sm">
                                  {tender.referenceNumber && (
                                    <div>
                                      <span className="font-medium">Referentie:</span> {tender.referenceNumber}
                                    </div>
                                  )}
                                  {tender.publicationDate && (
                                    <div className="flex items-center gap-2">
                                      <Calendar className="w-4 h-4 text-purple-600" />
                                      <span>Gepubliceerd: {tender.publicationDate}</span>
                                    </div>
                                  )}
                                  {tender.duration && (
                                    <div className="flex items-center gap-2">
                                      <Clock className="w-4 h-4 text-purple-600" />
                                      <span>Looptijd: {tender.duration}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* CPV Codes */}
                            {tender.cpvCodes && tender.cpvCodes.length > 0 && (
                              <div className="mt-4">
                                <h5 className="font-semibold text-slate-800 mb-2">CPV Codes</h5>
                                <div className="flex flex-wrap gap-2">
                                  {tender.cpvCodes.map((code, i) => (
                                    <span key={i} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">
                                      {code}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Required vs Missing Capabilities */}
                            <div className="grid md:grid-cols-2 gap-4 mt-4">
                              {tender.requiredCapabilities && tender.requiredCapabilities.length > 0 && (
                                <div>
                                  <h5 className="font-semibold text-green-800 mb-2">✅ Vereiste Capaciteiten</h5>
                                  <ul className="space-y-1">
                                    {tender.requiredCapabilities.map((cap, i) => (
                                      <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                                        {cap}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {tender.missingCapabilities && tender.missingCapabilities.length > 0 && (
                                <div>
                                  <h5 className="font-semibold text-amber-800 mb-2">⚠️ Ontbrekende Capaciteiten</h5>
                                  <ul className="space-y-1">
                                    {tender.missingCapabilities.map((cap, i) => (
                                      <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                                        <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" />
                                        {cap}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-3 mt-6">
                              {tender.tenderUrl && (
                                <a
                                  href={tender.tenderUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  Bekijk op TenderNed
                                </a>
                              )}
                              {tender.documentsUrl && (
                                <a
                                  href={tender.documentsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                                >
                                  <FileText className="w-4 h-4" />
                                  Download Documenten
                                </a>
                              )}
                              {tender.contactEmail && (
                                <a
                                  href={`mailto:${tender.contactEmail}?subject=Informatie aanvraag: ${tender.tenderId}`}
                                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                                >
                                  <Mail className="w-4 h-4" />
                                  Contact Opnemen
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Enhanced Recommendations */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                  Aanbevelingen & Actiepunten
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysis.recommendations.map((rec, index) => (
                    <div key={index} className={`p-4 rounded-lg border-l-4 ${
                      rec.priority === 'high' ? 'bg-red-50 border-red-500' :
                      rec.priority === 'medium' ? 'bg-amber-50 border-amber-500' :
                      'bg-blue-50 border-blue-500'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800">{rec.action}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              Deadline: {rec.deadline}
                            </span>
                            {rec.relatedTender && (
                              <span className="flex items-center gap-1">
                                <Briefcase className="w-4 h-4" />
                                {rec.relatedTender}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${
                          rec.priority === 'high' ? 'bg-red-200 text-red-800' :
                          rec.priority === 'medium' ? 'bg-amber-200 text-amber-800' :
                          'bg-blue-200 text-blue-800'
                        }`}>
                          {rec.priority.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default TenderAnalyzer;