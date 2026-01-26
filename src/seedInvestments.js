const mongoose = require('mongoose');
const dotenv = require('dotenv');
const InvestmentOption = require('./models/InvestmentOption');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

const seedData = [
    {
        title: "Adani Enterprises Feb 2026 NCD",
        slug: "adani-enterprises-feb-2026-ncd",
        issuer: "Adani Enterprises Limited",
        type: "NCD",
        category: "NCD",
        status: "Open",
        minInvestment: 10000,
        interestRate: "Up to 8.90% p.a.",
        maturity: "24-60 Months",
        rating: "AA-/Stable by ICRA & CARE",
        openDate: new Date("2026-01-06"),
        closeDate: new Date("2026-01-19"),
        description: `
            <p>Adani Enterprises Limited is raising up to ₹1,000 Crore via public issue of Secured, Rated, Listed, Redeemable Non-Convertible Debentures (NCDs).</p>
            <h3>Issue Highlights:</h3>
            <ul>
                <li><strong>Base Issue Size:</strong> ₹500 Crore</li>
                <li><strong>Green Shoe Option:</strong> ₹500 Crore</li>
                <li><strong>Credit Rating:</strong> CARE AA-/Stable & ICRA AA-/Stable</li>
                <li><strong>Tenure:</strong> 2, 3 and 5 Years</li>
            </ul>
        `,
        features: [
            "Effective Yield up to 8.90%",
            "Rated AA- (Stable) - High Safety",
            "Minimum Application: ₹10,000 (10 NCDs)",
            "Quarterly & Annual Interest Payment Options"
        ],
        applyLink: "https://www.bseindia.com/",
        isActive: true
    },
    {
        title: "Power Finance Corporation (PFC) Jan 2026 NCD",
        slug: "pfc-jan-2026-ncd",
        issuer: "Power Finance Corporation Limited",
        type: "NCD",
        category: "NCD",
        status: "Open",
        minInvestment: 10000,
        interestRate: "Up to 7.30% p.a.",
        maturity: "3-15 Years",
        rating: "AAA/Stable by CRISIL, CARE & ICRA",
        openDate: new Date("2026-01-16"),
        closeDate: new Date("2026-01-30"),
        description: `
            <p>Power Finance Corporation (PFC), a Maharatna CPSE, is offering Secured, Rated, Listed, Redeemable NCDs. Highest safety ratings ensuring timely servicing of financial obligations.</p>
            <h3>Issue Highlights:</h3>
            <ul>
                <li><strong>Total Issue Size:</strong> Up to ₹5,000 Crore</li>
                <li><strong>Credit Rating:</strong> AAA/Stable (Highest Safety)</li>
                <li><strong>Tenure:</strong> 3, 5, 10 and 15 Years</li>
                <li><strong>Tax Benefits:</strong> No TDS on listed bonds for resident individuals</li>
            </ul>
        `,
        features: [
            "Highest Rating (AAA) - Highest Safety",
            "Govt of India Undertaking (Maharatna)",
            "Regular Income Options",
            "Listed on BSE & NSE"
        ],
        applyLink: "https://www.pfcindia.com/",
        isActive: true
    },
    {
        title: "RBI Floating Rate Savings Bond 2020 (Taxable)",
        slug: "rbi-floating-rate-savings-bond",
        issuer: "Reserve Bank of India",
        type: "govt_bond",
        category: "BOND",
        status: "Open",
        minInvestment: 1000,
        interestRate: "8.05% p.a. (Floating)",
        maturity: "7 Years",
        rating: "Sovereign Guarantee",
        description: `
            <p>RBI Floating Rate Savings Bonds are issued by the Government of India. The interest rate is reset every six months (Jan 1 and July 1) and is linked to the NSC rate.</p>
            <ul>
                <li><strong>Safety:</strong> 100% Sovereign Guarantee</li>
                <li><strong>Interest Rate:</strong> 0.35% over NSC rate</li>
                <li><strong>Lock-in:</strong> 7 Years</li>
            </ul>
        `,
        features: [
            "Sovereign Guarantee (Zero Risk)",
            "Floating Interest Rate",
            "Semi-annual Interest Payout",
            "No Maximum Investment Limit"
        ],
        applyLink: "https://www.rbi.org.in/",
        isActive: true
    },
    {
        title: "NHAI 54EC Capital Gains Bonds",
        slug: "nhai-54ec-capital-gains-bond",
        issuer: "National Highways Authority of India",
        type: "corporate_bond",
        category: "BOND",
        status: "Open",
        minInvestment: 10000,
        interestRate: "5.25% p.a.",
        maturity: "5 Years",
        rating: "AAA/Stable",
        description: `
            <p>Save tax on Long Term Capital Gains (LTCG) from sale of property/assets by investing in NHAI 54EC Bonds under Section 54EC of Income Tax Act.</p>
            <ul>
                <li><strong>Tax Exemption:</strong> Up to ₹50 Lakhs in a FY</li>
                <li><strong>Interest:</strong> Taxable annual interest</li>
            </ul>
        `,
        features: [
            "Save LTCG Tax up to 20%",
            "AAA Rated - Highest Safety",
            "Annual Interest Payout",
            "Lock-in Period: 5 Years"
        ],
        applyLink: "https://nhai.gov.in/",
        isActive: true
    },
    {
        title: "Cat II AIF - Real Estate Opportunities Fund",
        slug: "cat-ii-aif-real-estate-fund",
        issuer: "Leading Asset Manager",
        type: "AIF_cat2",
        category: "AIF",
        status: "Open",
        minInvestment: 10000000,
        interestRate: "Target IR 18-20%",
        maturity: "5 Years + 2",
        rating: "Unrated",
        description: `
            <p>A Category II Alternative Investment Fund focused on high-yield debt opportunities in the residential real estate sector across top metro cities.</p>
        `,
        features: [
            "Access to Pre-IPO Deals",
            "Diversified Real Estate Portfolio",
            "Quarterly Distribution",
            "Focus on Last Mile Funding"
        ],
        isActive: true
    }
];

const seedDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_DB_URI);
        console.log('Connected to MongoDB');

        // Check for existing to avoid duplicates based on slug
        for (const item of seedData) {
            const exists = await InvestmentOption.findOne({ slug: item.slug });
            if (!exists) {
                await InvestmentOption.create(item);
                console.log(`Added: ${item.title}`);
            } else {
                console.log(`Skipped (Exists): ${item.title}`);
                // Optional: Update details if needed
                // await InvestmentOption.updateOne({ slug: item.slug }, item);
            }
        }

        console.log('Seeding completed');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedDB();
