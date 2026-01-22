const CalculatorContent = require('../models/CalculatorContent');

// Get all calculator contents
exports.getAllCalculatorContents = async (req, res) => {
  try {
    const contents = await CalculatorContent.find({ isActive: true }).sort({ calculatorId: 1 });
    res.json(contents);
  } catch (error) {
    console.error('Error fetching calculator contents:', error);
    res.status(500).json({ message: 'Error fetching calculator contents', error: error.message });
  }
};

// Get single calculator content by ID
exports.getCalculatorContentById = async (req, res) => {
  try {
    const { calculatorId } = req.params;
    const content = await CalculatorContent.findOne({ calculatorId, isActive: true });
    
    if (!content) {
      return res.status(404).json({ message: 'Calculator content not found' });
    }
    
    res.json(content);
  } catch (error) {
    console.error('Error fetching calculator content:', error);
    res.status(500).json({ message: 'Error fetching calculator content', error: error.message });
  }
};

// Create new calculator content (Admin only)
exports.createCalculatorContent = async (req, res) => {
  try {
    const { calculatorId, name, description, content, faqs, metaTitle, metaDescription, keywords } = req.body;
    
    // Check if content already exists
    const existingContent = await CalculatorContent.findOne({ calculatorId });
    if (existingContent) {
      return res.status(400).json({ message: 'Content for this calculator already exists' });
    }
    
    const newContent = new CalculatorContent({
      calculatorId,
      name,
      description,
      content: content || '',
      faqs: faqs || [],
      metaTitle: metaTitle || name,
      metaDescription: metaDescription || description,
      keywords: keywords || []
    });
    
    await newContent.save();
    res.status(201).json({ message: 'Calculator content created successfully', content: newContent });
  } catch (error) {
    console.error('Error creating calculator content:', error);
    res.status(500).json({ message: 'Error creating calculator content', error: error.message });
  }
};

// Update calculator content (Admin only)
exports.updateCalculatorContent = async (req, res) => {
  try {
    const { calculatorId } = req.params;
    const { name, description, content, faqs, metaTitle, metaDescription, keywords } = req.body;
    
    const contentDoc = await CalculatorContent.findOne({ calculatorId });
    
    if (!contentDoc) {
      return res.status(404).json({ message: 'Calculator content not found' });
    }
    
    // Update fields
    if (name) contentDoc.name = name;
    if (description) contentDoc.description = description;
    if (content !== undefined) contentDoc.content = content;
    if (faqs !== undefined) contentDoc.faqs = faqs;
    if (metaTitle) contentDoc.metaTitle = metaTitle;
    if (metaDescription) contentDoc.metaDescription = metaDescription;
    if (keywords !== undefined) contentDoc.keywords = keywords;
    
    await contentDoc.save();
    res.json({ message: 'Calculator content updated successfully', content: contentDoc });
  } catch (error) {
    console.error('Error updating calculator content:', error);
    res.status(500).json({ message: 'Error updating calculator content', error: error.message });
  }
};

// Delete calculator content (Admin only - soft delete)
exports.deleteCalculatorContent = async (req, res) => {
  try {
    const { calculatorId } = req.params;
    
    const content = await CalculatorContent.findOne({ calculatorId });
    
    if (!content) {
      return res.status(404).json({ message: 'Calculator content not found' });
    }
    
    content.isActive = false;
    await content.save();
    
    res.json({ message: 'Calculator content deleted successfully' });
  } catch (error) {
    console.error('Error deleting calculator content:', error);
    res.status(500).json({ message: 'Error deleting calculator content', error: error.message });
  }
};

// Seed default calculator contents (for initial setup)
exports.seedCalculatorContents = async (req, res) => {
  try {
    const defaultContents = [
      {
        calculatorId: 'sip',
        name: 'SIP Calculator',
        description: 'Calculate returns on your Systematic Investment Plan (SIP) investments',
        what: 'A SIP Calculator helps you estimate the future value of your monthly SIP investments in mutual funds. It shows how regular investments can grow over time with compound interest.',
        howToUse: 'Enter your monthly investment amount, expected annual return rate, and investment duration. The calculator will show your total investment, estimated returns, and final corpus.',
        benefits: [
          'Plan your financial goals effectively',
          'Understand the power of compounding',
          'Compare different investment scenarios',
          'Make informed investment decisions'
        ]
      },
      {
        calculatorId: 'stepup',
        name: 'Step-Up SIP Calculator',
        description: 'Calculate returns with annually increasing SIP amounts',
        what: 'A Step-Up SIP Calculator shows how increasing your SIP amount annually can significantly boost your wealth creation. It accounts for salary increments and inflation.',
        howToUse: 'Enter your initial monthly SIP, annual step-up percentage, expected returns, and duration. See how gradually increasing investments accelerate wealth building.',
        benefits: [
          'Align investments with income growth',
          'Beat inflation effectively',
          'Achieve goals faster',
          'Build larger corpus with same effort'
        ]
      },
      {
        calculatorId: 'mutualfund',
        name: 'Mutual Fund Calculator',
        description: 'Estimate returns on lumpsum and SIP mutual fund investments',
        what: 'A comprehensive calculator for both lumpsum and SIP investments in mutual funds. Compare different investment strategies and fund categories.',
        howToUse: 'Choose between lumpsum or SIP mode, enter investment amount, expected return rate, and time period. Analyze potential returns and plan accordingly.',
        benefits: [
          'Compare lumpsum vs SIP returns',
          'Evaluate different fund options',
          'Plan tax-saving investments',
          'Track investment performance'
        ]
      },
      {
        calculatorId: 'fd',
        name: 'FD Calculator',
        description: 'Calculate Fixed Deposit maturity amount and interest earned',
        what: 'An FD Calculator helps you determine the maturity amount of your Fixed Deposit based on principal, interest rate, and tenure. Supports different compounding frequencies.',
        howToUse: 'Enter deposit amount, annual interest rate, tenure, and compounding frequency (quarterly, half-yearly, yearly). Get instant maturity value and interest breakdown.',
        benefits: [
          'Compare FD offers from different banks',
          'Plan for guaranteed returns',
          'Understand compounding impact',
          'Make safe investment choices'
        ]
      },
      {
        calculatorId: 'ppf',
        name: 'PPF Calculator',
        description: 'Calculate Public Provident Fund returns with tax benefits',
        what: 'PPF Calculator estimates your Public Provident Fund corpus after 15 years. PPF offers tax-free returns under Section 80C with government-backed security.',
        howToUse: 'Enter your annual PPF contribution (₹500 to ₹1.5 lakh) and current interest rate. See your tax-free maturity amount and year-wise growth.',
        benefits: [
          'Tax-free returns (EEE status)',
          'Government-backed safety',
          'Long-term wealth creation',
          'Retirement planning tool'
        ]
      },
      {
        calculatorId: 'pf',
        name: 'PF Calculator',
        description: 'Calculate Provident Fund corpus with employer contribution',
        what: 'PF Calculator shows your Employee Provident Fund accumulation including both employee and employer contributions with interest.',
        howToUse: 'Enter monthly PF investment, current interest rate (typically 8.25%), investment duration, and contribution frequency. View total corpus at retirement.',
        benefits: [
          'Plan retirement corpus',
          'Understand employer contribution impact',
          'Tax benefits under Section 80C',
          'Secure retirement planning'
        ]
      },
      {
        calculatorId: 'nps',
        name: 'NPS Calculator',
        description: 'Calculate National Pension System returns and monthly pension',
        what: 'NPS Calculator estimates your retirement corpus and monthly pension from National Pension System. Shows lumpsum withdrawal and annuity options.',
        howToUse: 'Enter monthly contribution, current age, retirement age, expected return rate, and annuity rate. See retirement corpus, lumpsum amount, and monthly pension.',
        benefits: [
          'Additional tax deduction of ₹50,000',
          'Flexible investment options',
          'Market-linked returns',
          'Guaranteed monthly pension'
        ]
      },
      {
        calculatorId: 'rd',
        name: 'RD Calculator',
        description: 'Calculate Recurring Deposit maturity with monthly savings',
        what: 'RD Calculator helps you plan monthly savings with Recurring Deposits. Calculate maturity amount based on monthly deposits and interest rate.',
        howToUse: 'Enter monthly deposit amount, annual interest rate, and tenure in months. Get maturity value and total interest earned on your regular savings.',
        benefits: [
          'Disciplined monthly savings',
          'Fixed returns guaranteed',
          'Short to medium-term goals',
          'Low-risk investment option'
        ]
      },
      {
        calculatorId: 'ssy',
        name: 'Sukanya Samruddhi Yojana Calculator',
        description: 'Calculate returns for girl child savings scheme',
        what: 'SSY Calculator estimates maturity amount for Sukanya Samruddhi Yojana, a government scheme for girl child with highest interest rate and tax benefits.',
        howToUse: 'Enter annual deposit (₹250 to ₹1.5 lakh), start year, and current interest rate. See tax-free maturity amount after 21 years.',
        benefits: [
          'Highest interest rate among savings schemes',
          'Triple tax benefit (EEE)',
          'Secure future for girl child',
          'Partial withdrawal for education'
        ]
      },
      {
        calculatorId: 'scss',
        name: 'SCSS Calculator',
        description: 'Calculate Senior Citizens Savings Scheme quarterly interest',
        what: 'SCSS Calculator shows quarterly interest payouts for Senior Citizens Savings Scheme. Ideal for retirees seeking regular income with safety.',
        howToUse: 'Enter deposit amount (₹1,000 to ₹30 lakh), interest rate, and tenure (5 or 8 years). View quarterly interest and total returns.',
        benefits: [
          'Regular quarterly income',
          'High interest rates for seniors',
          'Tax benefit under Section 80C',
          'Government-backed security'
        ]
      },
      {
        calculatorId: 'elss',
        name: 'ELSS Calculator',
        description: 'Calculate tax-saving mutual fund returns with Section 80C benefits',
        what: 'ELSS Calculator estimates returns on Equity Linked Savings Scheme investments. ELSS offers tax deduction up to ₹1.5 lakh with shortest lock-in period.',
        howToUse: 'Enter monthly or lumpsum investment, expected return rate, and investment period (minimum 3 years). See potential returns with tax savings.',
        benefits: [
          'Tax deduction under Section 80C',
          'Shortest lock-in (3 years)',
          'Equity market returns',
          'Wealth creation with tax benefits'
        ]
      },
      {
        calculatorId: 'swp',
        name: 'SWP Calculator',
        description: 'Calculate Systematic Withdrawal Plan for regular income',
        what: 'SWP Calculator shows how you can withdraw regular income from mutual fund investments while your remaining corpus continues to grow.',
        howToUse: 'Enter initial investment, monthly withdrawal amount, expected return rate, and duration. See remaining corpus and total withdrawals over time.',
        benefits: [
          'Regular monthly income',
          'Tax-efficient withdrawals',
          'Corpus continues to grow',
          'Ideal for retirees'
        ]
      },
      {
        calculatorId: 'emi',
        name: 'EMI Calculator',
        description: 'Calculate Equated Monthly Installment for loans',
        what: 'EMI Calculator helps you determine monthly loan payments for home loans, car loans, or personal loans. Shows total interest and payment breakup.',
        howToUse: 'Enter loan amount, annual interest rate, and loan tenure in years. Get monthly EMI, total interest payable, and principal vs interest breakdown.',
        benefits: [
          'Plan loan affordability',
          'Compare different loan offers',
          'Understand interest burden',
          'Budget monthly expenses'
        ]
      },
      {
        calculatorId: 'downpayment',
        name: 'Down Payment Calculator',
        description: 'Calculate down payment and loan details for asset purchase',
        what: 'Down Payment Calculator helps you plan asset purchases by showing down payment amount, loan amount, processing fees, and monthly EMI.',
        howToUse: 'Enter total asset cost, down payment percentage, interest rate, processing fee, and loan tenure. See complete cost breakdown and EMI.',
        benefits: [
          'Plan home or car purchase',
          'Understand total cost of ownership',
          'Compare financing options',
          'Budget for upfront costs'
        ]
      },
      {
        calculatorId: 'cagr',
        name: 'CAGR Calculator',
        description: 'Calculate Compound Annual Growth Rate of investments',
        what: 'CAGR Calculator determines the annual growth rate of your investments over time. Essential for comparing different investment options.',
        howToUse: 'Enter initial investment value, final value, and investment duration. Get the compound annual growth rate percentage.',
        benefits: [
          'Compare investment performance',
          'Measure actual returns',
          'Evaluate fund managers',
          'Make data-driven decisions'
        ]
      },
      {
        calculatorId: 'depreciation',
        name: 'Depreciation Calculator',
        description: 'Calculate asset depreciation using multiple methods',
        what: 'Depreciation Calculator computes asset value reduction over time using Straight Line, Declining Balance, or Sum of Years methods.',
        howToUse: 'Select depreciation method, enter asset cost, salvage value percentage, useful life, and rate (for declining balance). View yearly depreciation schedule.',
        benefits: [
          'Tax planning and deductions',
          'Asset management',
          'Financial reporting',
          'Business expense calculation'
        ]
      },
      {
        calculatorId: 'brokerage',
        name: 'Brokerage Calculator',
        description: 'Calculate stock trading costs and brokerage charges',
        what: 'Brokerage Calculator shows total trading costs including brokerage, STT, GST, stamp duty, and other charges for equity trading.',
        howToUse: 'Enter buy/sell price, quantity, and brokerage rate. Get complete breakup of all charges and net profit/loss.',
        benefits: [
          'Understand true trading costs',
          'Compare broker charges',
          'Calculate break-even points',
          'Plan profitable trades'
        ]
      },
      {
        calculatorId: 'returns',
        name: 'Returns Estimator',
        description: 'Estimate investment returns across different scenarios',
        what: 'Returns Estimator helps you project potential returns on various investment types with different return rates and time horizons.',
        howToUse: 'Enter investment amount, expected annual return rate, and time period. Compare returns across different scenarios.',
        benefits: [
          'Goal-based planning',
          'Scenario analysis',
          'Risk-return assessment',
          'Investment comparison'
        ]
      },
      {
        calculatorId: 'risk',
        name: 'Risk Analyzer',
        description: 'Analyze investment risk and portfolio volatility',
        what: 'Risk Analyzer evaluates your investment risk profile and portfolio volatility to help you make risk-appropriate investment decisions.',
        howToUse: 'Enter portfolio details, asset allocation, and risk parameters. Get risk score and recommendations for portfolio optimization.',
        benefits: [
          'Understand risk tolerance',
          'Balance risk-reward',
          'Diversification insights',
          'Informed asset allocation'
        ]
      }
    ];
    
    let created = 0;
    let skipped = 0;
    
    for (const contentData of defaultContents) {
      const existing = await CalculatorContent.findOne({ calculatorId: contentData.calculatorId });
      if (!existing) {
        await CalculatorContent.create(contentData);
        created++;
      } else {
        skipped++;
      }
    }
    
    res.json({ 
      message: 'Calculator contents seeded successfully',
      created,
      skipped,
      total: defaultContents.length
    });
  } catch (error) {
    console.error('Error seeding calculator contents:', error);
    res.status(500).json({ message: 'Error seeding calculator contents', error: error.message });
  }
};
