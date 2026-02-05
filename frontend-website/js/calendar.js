// ===================== CALENDAR CALCULATION SYSTEM =====================

// Calendar Constants
const MONTHS = [
    "Meskerem", "Tikimt", "Hidar", "Tahsas",
    "Tir", "Yekatit", "Megabit", "Miyazya",
    "Genbot", "Sene", "Hamle", "Nehasse", "Pagumien"
];

const ASSIGNED_BY_JS_DAY = { 6: 8, 0: 7, 1: 6, 2: 5, 3: 4, 4: 3, 5: 2 };
const JS_DAY_NAME = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const FEAST_GAPS = [
    { name: "ነነዌ Nenewie", gap: 0, category: "" },
    { name: "ዓብይ ጾም Abiy Tsom", gap: 14, category: "" },
    { name: "ደብረ ዘይት Debre Zeyt", gap: 27, category: "small" },
    { name: "ሆሣዕና Hosaena (Palm Sunday)", gap: 21, category: "great" },
    { name: "ዓርቢ ስቅለት Good Friday", gap: 5, category: "great" },
    { name: "ትንሳኤ Fasika", gap: 2, category: "great" },
    { name: "ርክበ ካህናት Priests' Meeting", gap: 24, category: "" },
    { name: "ዕርገት Erget", gap: 15, category: "great" },
    { name: "በዓለ መንፈስ ቅዱስ Pentecost", gap: 10, category: "great" },
    { name: "ጾመ ሰነ Tsome Sene", gap: 1, category: "" },
    { name: "ጾመ ድህነት Mhlela Dihnet", gap: 2, category: "" }
];

const HOLIDAY_GROUPS = {
    fixed: [
        { name: "ቅ. ዮውሃንስ St. John (Eritrean New Year)", month: 0, day: 1 },
        { name: "መስቀል Meskel", month: 0, day: 17 },
        { name: "ቅ. ሚካኤል St. Archangel Michael", month: 2, day: 12 }
    ],
    great: [
        { name: "ልደት Lideta (Nativity)", month: 3, day: 29 },
        { name: "ጥምቀት Timket (Epiphany)", month: 4, day: 11 },
        { name: "ትስብእት Tsbiet (Incarnation)", month: 6, day: 29 },
        { name: "ሆሳዕና Hosaena (Palm Sunday)", movable: "ሆሣዕና Hosaena (Palm Sunday)" },
        { name: "ዓርቢ ስቅለት Sklet (Good Friday)", movable: "ዓርቢ ስቅለት Good Friday" },
        { name: "ትንሳኤ Fasika", movable: "ትንሳኤ Fasika" },
        { name: "ዕርገት Erget (Ascension)", movable: "ዕርገት Erget" },
        { name: "በዓለ መንፈስ ቅዱስ Pentecost", movable: "በዓለ መንፈስ ቅዱስ Pentecost" },
        { name: "ደብረ ታቦር", month: 11, day: 13 }
    ],
    small: [
        { name: "ግዝረት Gzret", month: 4, day: 6 },
        { name: "ቃና ዘገሊላ Kana zegelila", month: 4, day: 12 },
        { name: "ባዓለ ስምኦን ኣረጋዊ Beale Simon", month: 5, day: 8 },
        { name: "ደብረ ዘይት Debre Zeyt", movable: "ደብረ ዘይት Debre Zeyt" },
        { name: "መስቀል Meskel", month: 0, day: 17 },
        { name: "መስቀል Meskel", month: 6, day: 10 }
    ],
    stMary: [
        { name: "ባዓታ Beata", month: 3, day: 3 },
        { name: "ዐስተርእዮ Astereyo", month: 4, day: 21 },
        { name: "ለደታ Ldeta", month: 8, day: 1 },
        { name: "ቅዳሴ ቤታ Kdasie Bieta", month: 9, day: 20 }
    ],
    stSaints1: [
        { name: "ኪዳነ ምሕረት Kidane Mihret", month: 5, day: 16 },
        { name: "ኪዳነ እግዚአብሔር Kidane Egziabher", month: 2, day: 2 },
        { name: "እንተአ መርዓዊ Ente'a Merawi", month: 4, day: 4 },
        { name: "ኪዳነ ጸጋ ማርያም Kidane Tsega Mariam", month: 5, day: 5 }
    ],
    BirthFeasts: [
        { name: "ድርሳ ቅዱስ Dirsa Kidus", month: 15, day: 15 },
        { name: "ድርሳ ማርያም Dirsa Mariam", month: 25, day: 25 },
        { name: "ጊዮርጊስ Giorgis", month: 9, day: 9 }
    ]
};

// Calendar Utility Functions
const mod = (n, m) => ((n % m) + m) % m;

function isGregorianLeap(y) {
    return (y % 4 === 0) && (y % 100 !== 0 || y % 400 === 0);
}

function meskerem1DateUTC(ecYear) {
    const gYear = ecYear + 7;
    const day = isGregorianLeap(gYear + 1) ? 12 : 11;
    return new Date(Date.UTC(gYear, 8, day));
}

function ecMonthLen(mIdx, ecYear) {
    if (mIdx === 12) {
        if (ecYear % 128 === 0) return 7;
        if (ecYear % 4 === 3) return 6;
        return 5;
    }
    return 30;
}

function ecToGregorianISO(ecYear, monthIdx, day) {
    const base = meskerem1DateUTC(ecYear);
    let offset = 0;
    for (let m = 0; m < monthIdx; m++) offset += ecMonthLen(m, ecYear);
    offset += day - 1;
    const d = new Date(base.getTime());
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString().slice(0, 10);
}

function addDaysEC(ecYear, monthIdx, day, add) {
    let y = ecYear, m = monthIdx, d = day;
    let left = add;
    while (left > 0) {
        const len = ecMonthLen(m, y);
        const remaining = len - d;
        if (left <= remaining) {
            d += left;
            left = 0;
        } else {
            left -= (remaining + 1);
            d = 1;
            m++;
            if (m > 12) {
                m = 0; y++;
            }
        }
    }
    return { ecYear: y, monthIdx: m, day: d };
}

// Bahre Hasab Core Calculation
function coreCalc(ecYear) {
    const amete = 5500 + ecYear;
    const remainder1 = mod(amete, 532);
    const menber = mod(remainder1, 19);
    const abektie = mod((menber - 1) * 11, 30);
    const metke = 30 - abektie;
    return { amete, remainder1, menber, abektie, metke };
}

function computeNenewie(ecYear, metke) {
    const metkeMonthIdx = (metke >= 15) ? 0 : 1;
    const metkeISO = ecToGregorianISO(ecYear, metkeMonthIdx, metke);
    const jsDay = new Date(metkeISO + "T00:00:00Z").getUTCDay();
    const weekdayAssigned = ASSIGNED_BY_JS_DAY[jsDay];
    const weekdayName = JS_DAY_NAME[jsDay];
    const mebaja = metke + weekdayAssigned;
    let nenMonthIdx = (metke >= 15) ? 4 : 5;
    let nenDay = mebaja;
    if (nenDay > 30) {
        nenDay -= 30;
        nenMonthIdx++;
    }
    const nenGregISO = ecToGregorianISO(ecYear, nenMonthIdx, nenDay);
    return {
        metkeMonthIdx,
        metkeISO,
        weekdayName,
        weekdayAssigned,
        mebaja,
        nenEC: { ecYear, monthIdx: nenMonthIdx, day: nenDay },
        nenGregISO
    };
}

// Calendar Rendering Functions
function renderCalendar() {
    const ecYear = Number(document.getElementById('year').value || 0);
    if (!ecYear) {
        alert("Please enter a valid Eritrean year.");
        return;
    }

    const core = coreCalc(ecYear);
    const nen = computeNenewie(ecYear, core.metke);

    // Render Core Results
    renderCoreTable(core, nen);
    
    // Render Weekday Assignment
    renderWeekdayTable(nen, core.metke);
    
    // Render Feasts
    renderFeastsTable(ecYear, nen);
    
    // Render Fixed Holidays
    renderFixedHolidays(ecYear);
    
    // Render Evangelist Year
    renderEvangelistYear(ecYear);
}

function renderCoreTable(core, nen) {
    const coreBody = document.getElementById('coreBody');
    coreBody.innerHTML = `
        <tr><th>ዓመተ ዓለም Amete Alem</th><td>${core.amete}</td></tr>
        <tr><th>ዓብይ ቀመር Remainder1 (mod 532)</th><td>${core.remainder1}</td></tr>
        <tr><th>መንበር Menber (mod 19)</th><td>${core.menber}</td></tr>
        <tr><th>ኣበቅቴ Abektie</th><td>${core.abektie}</td></tr>
        <tr><th>መጥቅዕ Metke (day)</th><td>${core.metke}</td></tr>
        <tr><th>መጥቅዕ ዝወድቀሉ ወርሒ Metke "virtual month"</th><td>${MONTHS[nen.metkeMonthIdx]}</td></tr>
        <tr><th>Metke date (E.C.)</th><td>${MONTHS[nen.metkeMonthIdx]} ${core.metke}</td></tr>
        <tr><th>Metke weekday</th><td>${nen.weekdayName}</td></tr>
        <tr><th>መባጃ ሓመር Mebaja</th><td>${nen.mebaja}</td></tr>
        <tr><th>ነነዌ ብግዕዝ Nenewie (E.C.)</th><td>${MONTHS[nen.nenEC.monthIdx]} ${nen.nenEC.day}</td></tr>
        <tr><th>ነነዌ ብጊርጎርያን Nenewie (Gregorian)</th><td>${nen.nenGregISO}</td></tr>
        <tr><th>Pagumien length</th><td>${ecMonthLen(12, core.amete - 5500)} days</td></tr>
    `;
}

function renderWeekdayTable(nen, metke) {
    const weekdayBody = document.getElementById('weekdayBody');
    const jsDay = new Date(nen.metkeISO + "T00:00:00Z").getUTCDay();
    const assigned = ASSIGNED_BY_JS_DAY[jsDay];
    const mebaja = metke + assigned;
    
    weekdayBody.innerHTML = `
        <tr style="color:red; font-weight:bold;">
            <td>${nen.weekdayName} ✔ actual</td>
            <td>${assigned}</td>
            <td>${mebaja}</td>
        </tr>
    `;
    
    // Add other weekdays for reference
    Object.entries(ASSIGNED_BY_JS_DAY).forEach(([day, value]) => {
        if (parseInt(day) !== jsDay) {
            const dayName = JS_DAY_NAME[day];
            const calculatedMebaja = metke + value;
            weekdayBody.innerHTML += `
                <tr>
                    <td>${dayName}</td>
                    <td>${value}</td>
                    <td>${calculatedMebaja}</td>
                </tr>
            `;
        }
    });
}

function renderFeastsTable(ecYear, nen) {
    const feastBody = document.getElementById('feastBody');
    let totalOffset = 0;
    feastBody.innerHTML = '';

    FEAST_GAPS.forEach((feastObj, i) => {
        totalOffset += feastObj.gap;
        const feastEC = addDaysEC(ecYear, nen.nenEC.monthIdx, nen.nenEC.day, totalOffset);
        const feastECStr = `${MONTHS[feastEC.monthIdx]} ${feastEC.day}`;
        const feastGreg = ecToGregorianISO(feastEC.ecYear, feastEC.monthIdx, feastEC.day);
        
        feastBody.innerHTML += `
            <tr>
                <td>${i + 1}</td>
                <td>${feastObj.name}</td>
                <td>${totalOffset}</td>
                <td>${feastECStr}</td>
                <td>${feastGreg}</td>
            </tr>
        `;
    });
}

function renderFixedHolidays(ecYear) {
    // Get movable feasts first
    const movableFeasts = calculateMovableFeasts(ecYear);
    
    // Render each holiday category
    Object.keys(HOLIDAY_GROUPS).forEach(category => {
        const tbody = document.getElementById(`${category}HolidayBody`);
        if (!tbody) return;
        
        tbody.innerHTML = '';
        HOLIDAY_GROUPS[category].forEach((holiday, index) => {
            let ecDateStr, gcDateStr, weekday;
            
            if (holiday.movable && movableFeasts[holiday.movable]) {
                // Movable feast
                const feast = movableFeasts[holiday.movable];
                ecDateStr = feast.ecStr;
                gcDateStr = feast.gcStr;
                weekday = feast.weekday;
            } else {
                // Fixed feast
                const gDate = ecToGregorianISO(ecYear, holiday.month, holiday.day);
                const gDateObj = new Date(gDate + "T00:00:00Z");
                weekday = JS_DAY_NAME[gDateObj.getUTCDay()];
                ecDateStr = `${MONTHS[holiday.month]} ${holiday.day}`;
                gcDateStr = gDate;
            }
            
            tbody.innerHTML += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${holiday.name}</td>
                    <td>${ecDateStr}</td>
                    <td>${gcDateStr}</td>
                    <td>${weekday}</td>
                </tr>
            `;
        });
    });
}

function calculateMovableFeasts(ecYear) {
    const core = coreCalc(ecYear);
    const nen = computeNenewie(ecYear, core.metke);
    const movableFeasts = {};
    
    let totalOffset = 0;
    FEAST_GAPS.forEach(feastObj => {
        totalOffset += feastObj.gap;
        const feastEC = addDaysEC(ecYear, nen.nenEC.monthIdx, nen.nenEC.day, totalOffset);
        const feastECStr = `${MONTHS[feastEC.monthIdx]} ${feastEC.day}`;
        const feastGreg = ecToGregorianISO(feastEC.ecYear, feastEC.monthIdx, feastEC.day);
        const gDateObj = new Date(feastGreg + "T00:00:00Z");
        const weekday = JS_DAY_NAME[gDateObj.getUTCDay()];
        
        movableFeasts[feastObj.name] = {
            ecStr: feastECStr,
            gcStr: feastGreg,
            weekday: weekday
        };
    });
    
    return movableFeasts;
}

function renderEvangelistYear(ecYear) {
    const evangelists = ["John ዮውሃንስ", "Matthew ማቴዎስ", "Mark ማርቆስ", "Luke ሉቃስ"];
    const zemeneIndex = ecYear % 4;
    const zemeneName = evangelists[zemeneIndex];
    
    const zemeneElement = document.getElementById('zemeneText');
    if (zemeneElement) {
        zemeneElement.innerHTML = `
            Welcome to the Year of <strong>${zemeneName}</strong>! 
            እንቃዕ ናብ ዘበነ <strong>${zemeneName}</strong> ብሰላም አብጸሓና።
        `;
    }
}

// Initialize Calendar
function initializeCalendar() {
    const calcBtn = document.getElementById('calc');
    const printBtn = document.getElementById('printBtn');
    
    if (calcBtn) {
        calcBtn.addEventListener('click', renderCalendar);
    }
    
    if (printBtn) {
        printBtn.addEventListener('click', () => window.print());
    }
    
    // Render calendar on page load if we're on the calendar page
    if (document.getElementById('bahre-hasab').classList.contains('active')) {
        renderCalendar();
    }
}

// Add this to your existing window.load event
window.addEventListener('load', function() {
    // ... your existing load code ...
    initializeCalendar();
});

// Custom Holidays Management
let customHolidays = JSON.parse(localStorage.getItem('customHolidays') || '[]');

function initializeCustomHolidays() {
    const addBtn = document.getElementById('addCustomHoliday');
    if (addBtn) {
        addBtn.addEventListener('click', addCustomHoliday);
    }
    renderCustomHolidays();
}

function addCustomHoliday() {
    const name = document.getElementById('customHolidayName').value;
    const month = parseInt(document.getElementById('customHolidayMonth').value);
    const day = parseInt(document.getElementById('customHolidayDay').value);
    
    if (!name || isNaN(month) || isNaN(day)) {
        alert('Please fill all fields');
        return;
    }
    
    const ecYear = parseInt(document.getElementById('year').value) || 2017;
    const holiday = {
        id: Date.now(),
        name,
        month,
        day,
        ecYear
    };
    
    customHolidays.push(holiday);
    localStorage.setItem('customHolidays', JSON.stringify(customHolidays));
    renderCustomHolidays();
    
    // Clear form
    document.getElementById('customHolidayName').value = '';
    document.getElementById('customHolidayDay').value = '';
}

function renderCustomHolidays() {
    const container = document.getElementById('customHolidaysList');
    const ecYear = parseInt(document.getElementById('year').value) || 2017;
    
    const yearHolidays = customHolidays.filter(h => h.ecYear === ecYear);
    
    if (yearHolidays.length === 0) {
        container.innerHTML = '<p class="note">No custom holidays added for this year.</p>';
        return;
    }
    
    let html = '<h4>Custom Holidays for ' + ecYear + '</h4>';
    yearHolidays.forEach(holiday => {
        const ecDateStr = `${MONTHS[holiday.month]} ${holiday.day}`;
        const gcDate = ecToGregorianISO(ecYear, holiday.month, holiday.day);
        const gDateObj = new Date(gcDate + "T00:00:00Z");
        const weekday = JS_DAY_NAME[gDateObj.getUTCDay()];
        
        html += `
            <div class="program-item">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${holiday.name}</strong><br>
                        ${ecDateStr} (${gcDate}) - ${weekday}
                    </div>
                    <button onclick="removeCustomHoliday(${holiday.id})" class="btn-danger" style="padding: 0.25rem 0.5rem;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function removeCustomHoliday(id) {
    customHolidays = customHolidays.filter(h => h.id !== id);
    localStorage.setItem('customHolidays', JSON.stringify(customHolidays));
    renderCustomHolidays();
}

// Update the initializeCalendar function to include custom holidays
function initializeCalendar() {
    const calcBtn = document.getElementById('calc');
    const printBtn = document.getElementById('printBtn');
    
    if (calcBtn) {
        calcBtn.addEventListener('click', function() {
            renderCalendar();
            renderCustomHolidays();
        });
    }
    
    if (printBtn) {
        printBtn.addEventListener('click', () => window.print());
    }
    
    initializeCustomHolidays();
    
    // Render calendar on page load if we're on the calendar page
    if (document.getElementById('bahre-hasab').classList.contains('active')) {
        renderCalendar();
        renderCustomHolidays();
    }
}

/////////////////////Enhanced Calendar Features
// Advanced Calendar Features
function getCurrentEritreanYear() {
    const now = new Date();
    const currentGregorianYear = now.getFullYear();
    return currentGregorianYear - 7; // Convert to Eritrean year
}

function calculateAllFeastsForYear(ecYear) {
    const core = coreCalc(ecYear);
    const nen = computeNenewie(ecYear, core.metke);
    const results = {
        year: ecYear,
        coreValues: core,
        nenewie: nen,
        movableFeasts: [],
        fixedFeasts: [],
        allHolidays: []
    };
    
    // Calculate movable feasts
    let totalOffset = 0;
    FEAST_GAPS.forEach(feastObj => {
        totalOffset += feastObj.gap;
        const feastEC = addDaysEC(ecYear, nen.nenEC.monthIdx, nen.nenEC.day, totalOffset);
        const feastECStr = `${MONTHS[feastEC.monthIdx]} ${feastEC.day}`;
        const feastGreg = ecToGregorianISO(feastEC.ecYear, feastEC.monthIdx, feastEC.day);
        const gDateObj = new Date(feastGreg + "T00:00:00Z");
        const weekday = JS_DAY_NAME[gDateObj.getUTCDay()];
        
        results.movableFeasts.push({
            name: feastObj.name,
            offset: totalOffset,
            ecDate: feastECStr,
            gregorianDate: feastGreg,
            weekday: weekday,
            category: feastObj.category
        });
    });
    
    // Add fixed feasts
    Object.values(HOLIDAY_GROUPS).flat().forEach(holiday => {
        if (!holiday.movable) {
            const gDate = ecToGregorianISO(ecYear, holiday.month, holiday.day);
            const gDateObj = new Date(gDate + "T00:00:00Z");
            const weekday = JS_DAY_NAME[gDateObj.getUTCDay()];
            const ecDateStr = `${MONTHS[holiday.month]} ${holiday.day}`;
            
            results.fixedFeasts.push({
                name: holiday.name,
                ecDate: ecDateStr,
                gregorianDate: gDate,
                weekday: weekday
            });
        }
    });
    
    // Combine all holidays
    results.allHolidays = [...results.movableFeasts, ...results.fixedFeasts];
    results.allHolidays.sort((a, b) => new Date(a.gregorianDate) - new Date(b.gregorianDate));
    
    return results;
}

// Export calendar data as JSON
function exportCalendarData() {
    const ecYear = parseInt(document.getElementById('year').value) || 2017;
    const data = calculateAllFeastsForYear(ecYear);
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.download = `eritrean-calendar-${ecYear}.json`;
    link.href = url;
    link.click();
    
    URL.revokeObjectURL(url);
}

// Add export button to your calendar section HTML
function addExportButton() {
    const calendarSection = document.getElementById('bahre-hasab');
    const exportBtn = document.createElement('button');
    exportBtn.id = 'exportCalendar';
    exportBtn.textContent = 'Export Calendar Data';
    exportBtn.style.marginTop = '1rem';
    exportBtn.addEventListener('click', exportCalendarData);
    
    const calcCard = calendarSection.querySelector('.card');
    if (calcCard) {
        calcCard.appendChild(exportBtn);
    }
}

// Update the initializeCalendar function
function initializeCalendar() {
    const calcBtn = document.getElementById('calc');
    const printBtn = document.getElementById('printBtn');
    
    if (calcBtn) {
        calcBtn.addEventListener('click', function() {
            renderCalendar();
            renderCustomHolidays();
        });
    }
    
    if (printBtn) {
        printBtn.addEventListener('click', () => window.print());
    }
    
    initializeCustomHolidays();
    addExportButton();
    
    // Set current year as default
    const yearInput = document.getElementById('year');
    if (yearInput && !yearInput.value) {
        yearInput.value = getCurrentEritreanYear();
    }
    
    // Render calendar on page load if we're on the calendar page
    if (document.getElementById('bahre-hasab').classList.contains('active')) {
        renderCalendar();
        renderCustomHolidays();
    }
}