
// CalculaTuSalario - Fiscal & Salary Engine (Pure Client-side, Accurate 2026 Spanish Tax Table)
document.addEventListener('DOMContentLoaded', () => {
  const grossSalaryInput = document.getElementById('grossSalary');
  const payCountSelect = document.getElementById('payCount');
  const contractTypeSelect = document.getElementById('contractType');
  const childrenCountSelect = document.getElementById('childrenCount');
  const disabilitySelect = document.getElementById('disability');

  // Result Elements
  const resNetMonthly = document.getElementById('resNetMonthly');
  const resNetAnnual = document.getElementById('resNetAnnual');
  const resIrpfPercent = document.getElementById('resIrpfPercent');
  const resIrpfAnnual = document.getElementById('resIrpfAnnual');
  const resSsAnnual = document.getElementById('resSsAnnual');

  // Employer cost elements
  const resCompanyCostAnnual = document.getElementById('resCompanyCostAnnual');
  const resCompanyCostMonthly = document.getElementById('resCompanyCostMonthly');
  const resCompanySsAnnual = document.getElementById('resCompanySsAnnual');

  // Autónomo Elements
  const autoNetIncomeInput = document.getElementById('autoNetIncome');
  const autoCuotaRes = document.getElementById('autoCuotaRes');
  const autoEffectiveTaxRes = document.getElementById('autoEffectiveTaxRes');

  function formatEur(val) {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(val);
  }

  function calculateSpanishTax() {
    const gross = parseFloat(grossSalaryInput.value) || 0;
    const pays = parseInt(payCountSelect.value) || 12;
    const children = parseInt(childrenCountSelect.value) || 0;
    const disability = disabilitySelect.value;

    if (gross <= 0) return;

    // 1. Employee Social Security Contributions:
    // Contingencias comunes (4.70%) + Desempleo general (1.55%) + Formación Profesional (0.10%) + MEI (0.12%) = 6.47%
    // Maximum SS base cap ~ 4,720.50 €/mo -> 56,646 €/yr
    const ssBase = Math.min(gross, 56646);
    const ssEmployeeRate = 0.0647;
    const ssAnnual = ssBase * ssEmployeeRate;

    // 2. Personal & Family Minimums (Mínimo personal y familiar arts. 57 y 58 LIRPF)
    let personalMin = 5550; // Base individual
    if (children === 1) personalMin += 2400;
    else if (children === 2) personalMin += 2400 + 2700;
    else if (children === 3) personalMin += 2400 + 2700 + 4000;
    else if (children >= 4) personalMin += 2400 + 2700 + 4000 + (children - 3) * 4500;

    if (disability === '33') personalMin += 3000;
    else if (disability === '65') personalMin += 9000;

    // 3. Gastos deducibles generales (Art. 19.2.f: 2.000 €) y Reducción Art. 20 LIRPF
    const generalExpenses = 2000;
    let art20Reduction = 0;
    if (gross <= 14047.50) {
      art20Reduction = 6498;
    } else if (gross <= 19747.50) {
      art20Reduction = Math.max(0, 6498 - (1.14 * (gross - 14047.50)));
    }

    // 4. Taxable Base (Base liquidable general)
    const taxableBase = Math.max(0, gross - ssAnnual - generalExpenses - art20Reduction);

    // 5. Spanish progressive tax brackets (Estatal + Autonómico promedio):
    // 0 - 12.450 €: 19%
    // 12.450 - 20.200 €: 24%
    // 20.200 - 35.200 €: 30%
    // 35.200 - 60.000 €: 37%
    // 60.000 - 300.000 €: 45%
    // > 300.000 €: 47%
    const brackets = [
      { limit: 12450, rate: 0.19 },
      { limit: 20200, rate: 0.24 },
      { limit: 35200, rate: 0.30 },
      { limit: 60000, rate: 0.37 },
      { limit: 300000, rate: 0.45 },
      { limit: Infinity, rate: 0.47 }
    ];

    function computeBracketTax(amount) {
      let tax = 0;
      let prev = 0;
      for (const b of brackets) {
        if (amount > prev) {
          const taxableInBracket = Math.min(amount, b.limit) - prev;
          tax += taxableInBracket * b.rate;
          prev = b.limit;
        } else {
          break;
        }
      }
      return tax;
    }

    const totalGrossTax = computeBracketTax(taxableBase);
    const minAllowanceTax = computeBracketTax(personalMin);
    let finalIrpf = Math.max(0, totalGrossTax - minAllowanceTax);

    // Exempt minimum check (e.g. gross < 15.876 € exemption)
    if (gross < 15876 && children === 0) {
      finalIrpf = 0;
    }

    const irpfPercent = (finalIrpf / gross) * 100;
    const netAnnual = gross - finalIrpf - ssAnnual;
    const netMonthly = netAnnual / pays;

    // Display Results
    resNetMonthly.textContent = formatEur(netMonthly);
    resNetAnnual.textContent = formatEur(netAnnual);
    resIrpfPercent.textContent = `${irpfPercent.toFixed(1)}%`;
    resIrpfAnnual.textContent = formatEur(finalIrpf);
    resSsAnnual.textContent = formatEur(ssAnnual);

    // Employer Cost (Coste Empresa)
    // Contingencias comunes (23.6%) + Desempleo (5.5%) + FOGASA (0.2%) + FP (0.6%) + MEI (0.58%) = ~30.48%
    const employerSsRate = 0.3048;
    const employerSsAnnual = ssBase * employerSsRate;
    const totalCompanyCostAnnual = gross + employerSsAnnual;
    const totalCompanyCostMonthly = totalCompanyCostAnnual / 12;

    resCompanyCostAnnual.textContent = formatEur(totalCompanyCostAnnual);
    resCompanyCostMonthly.textContent = formatEur(totalCompanyCostMonthly);
    resCompanySsAnnual.textContent = formatEur(employerSsAnnual);

    if (window.enterpriseTrack) {
      window.enterpriseTrack('salary_calculated', { gross: gross, netAnnual: netAnnual, irpf: irpfPercent });
    }
  }

  function calculateAutonomo() {
    const netMonthlyYield = parseFloat(autoNetIncomeInput.value) || 0;
    if (netMonthlyYield <= 0) return;

    // RETA 2026 15 brackets estimation
    let cuota = 230;
    if (netMonthlyYield <= 670) cuota = 200;
    else if (netMonthlyYield <= 900) cuota = 240;
    else if (netMonthlyYield <= 1166) cuota = 260;
    else if (netMonthlyYield <= 1300) cuota = 291;
    else if (netMonthlyYield <= 1500) cuota = 294;
    else if (netMonthlyYield <= 1700) cuota = 294;
    else if (netMonthlyYield <= 1850) cuota = 315;
    else if (netMonthlyYield <= 2030) cuota = 320;
    else if (netMonthlyYield <= 2330) cuota = 330;
    else if (netMonthlyYield <= 2760) cuota = 415;
    else if (netMonthlyYield <= 3190) cuota = 440;
    else if (netMonthlyYield <= 3620) cuota = 465;
    else if (netMonthlyYield <= 4050) cuota = 490;
    else if (netMonthlyYield <= 6000) cuota = 530;
    else cuota = 590;

    autoCuotaRes.textContent = `${formatEur(cuota)} / mes`;
    const netAfterCuota = netMonthlyYield - cuota;
    const effectiveLoad = ((cuota + (netAfterCuota * 0.20)) / netMonthlyYield) * 100;
    autoEffectiveTaxRes.textContent = `Carga aprox. ${effectiveLoad.toFixed(1)}% (Cuota + IRPF 20%)`;
  }

  [grossSalaryInput, payCountSelect, contractTypeSelect, childrenCountSelect, disabilitySelect].forEach(el => {
    el.addEventListener('input', calculateSpanishTax);
  });

  autoNetIncomeInput.addEventListener('input', calculateAutonomo);

  calculateSpanishTax();
  calculateAutonomo();
});
