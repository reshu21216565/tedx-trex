import * as XLSX from 'xlsx';

export interface RawLedgerRow {
  'Ticket ID': string;
  'Attendee Name': string;
  'Email Address': string;
  'Pass Type': string;
  'Notes / Group Affiliation': string;
  'Approval Status': string;
}

export const SAMPLE_TEDX_LEDGER_DATA: RawLedgerRow[] = [
  // 1-10: General & VIP Attendees
  {
    'Ticket ID': 'TEDX-2026-001',
    'Attendee Name': 'Dr. Marcus Vance',
    'Email Address': 'marcus.vance@neurotech.org',
    'Pass Type': 'VIP Guest',
    'Notes / Group Affiliation': 'Keynote Speaker Guest',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },
  {
    'Ticket ID': 'TEDX-2026-002',
    'Attendee Name': 'Elena Rostova',
    'Email Address': 'elena.rostova@designlab.io',
    'Pass Type': 'General Admission',
    'Notes / Group Affiliation': 'Individual Registration #102',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },
  {
    'Ticket ID': 'TEDX-2026-003',
    'Attendee Name': 'Arjun Mehta',
    'Email Address': 'arjun.mehta@quantumleap.in',
    'Pass Type': 'General Admission',
    'Notes / Group Affiliation': 'Individual Registration #103',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },
  {
    'Ticket ID': 'TEDX-2026-004',
    'Attendee Name': 'Dr. Amina Al-Mansoor',
    'Email Address': 'a.almansoor@biomed.ae',
    'Pass Type': 'VIP Guest',
    'Notes / Group Affiliation': 'Panelist Host',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },
  {
    'Ticket ID': 'TEDX-2026-005',
    'Attendee Name': 'Carlos Mendoza',
    'Email Address': 'carlos.mendoza@solarenergy.mx',
    'Pass Type': 'General Admission',
    'Notes / Group Affiliation': 'Early Bird Ticket',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },
  {
    'Ticket ID': 'TEDX-2026-006',
    'Attendee Name': 'Samantha Reed',
    'Email Address': 'samantha.reed@gmail.com',
    'Pass Type': 'General Admission',
    'Notes / Group Affiliation': 'Individual Registration #106',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },
  {
    'Ticket ID': 'TEDX-2026-007',
    'Attendee Name': 'Kenji Takahashi',
    'Email Address': 'kenji.takahashi@robotics.jp',
    'Pass Type': 'Speaker Pass',
    'Notes / Group Affiliation': 'Morning Session Speaker',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },
  {
    'Ticket ID': 'TEDX-2026-008',
    'Attendee Name': 'Nadia Benali',
    'Email Address': 'nadia.benali@ecofuture.org',
    'Pass Type': 'Speaker Pass',
    'Notes / Group Affiliation': 'Afternoon Session Speaker',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },
  {
    'Ticket ID': 'TEDX-2026-009',
    'Attendee Name': 'David O\'Connor',
    'Email Address': 'doconnor@soundwaves.ie',
    'Pass Type': 'VIP Guest',
    'Notes / Group Affiliation': 'Cultural Partner',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },
  {
    'Ticket ID': 'TEDX-2026-010',
    'Attendee Name': 'Zara Patel',
    'Email Address': 'zara.patel@fintech.co.uk',
    'Pass Type': 'General Admission',
    'Notes / Group Affiliation': 'Individual Registration #110',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },

  // 11-13: Group Pass #1 (Team Climate - Expanded from 1 Form submission into 3 individual tickets)
  {
    'Ticket ID': 'TEDX-2026-011',
    'Attendee Name': 'Liam Chen',
    'Email Address': 'liam.chen@climateaction.org',
    'Pass Type': 'Group Pass',
    'Notes / Group Affiliation': 'Group Pass: Climate Action Team (Primary Contact: Liam Chen)',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },
  {
    'Ticket ID': 'TEDX-2026-012',
    'Attendee Name': 'Maya Lin',
    'Email Address': 'maya.lin@climateaction.org',
    'Pass Type': 'Group Pass',
    'Notes / Group Affiliation': 'Group Pass: Climate Action Team (Primary Contact: Liam Chen)',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },
  {
    'Ticket ID': 'TEDX-2026-013',
    'Attendee Name': 'Tariq Hassan',
    'Email Address': 'tariq.h@climateaction.org',
    'Pass Type': 'Group Pass',
    'Notes / Group Affiliation': 'Group Pass: Climate Action Team (Primary Contact: Liam Chen)',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },

  // 14-20: Students & General
  {
    'Ticket ID': 'TEDX-2026-014',
    'Attendee Name': 'Chloe Dubois',
    'Email Address': 'chloe.dubois@sorbonne-etu.fr',
    'Pass Type': 'Student Pass',
    'Notes / Group Affiliation': 'Student ID Verified',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },
  {
    'Ticket ID': 'TEDX-2026-015',
    'Attendee Name': 'Rahul Sharma',
    'Email Address': 'rahul.s@iitb.ac.in',
    'Pass Type': 'Student Pass',
    'Notes / Group Affiliation': 'Student ID Verified',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },
  {
    'Ticket ID': 'TEDX-2026-016',
    'Attendee Name': 'Hannah Schmidt',
    'Email Address': 'hannah.schmidt@berlin-tech.de',
    'Pass Type': 'Student Pass',
    'Notes / Group Affiliation': 'Student ID Verified',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },
  {
    'Ticket ID': 'TEDX-2026-017',
    'Attendee Name': 'Michael Chang',
    'Email Address': 'mchang@stanford.edu',
    'Pass Type': 'Student Pass',
    'Notes / Group Affiliation': 'Student ID Verified',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },
  {
    'Ticket ID': 'TEDX-2026-018',
    'Attendee Name': 'Fatima Zahra',
    'Email Address': 'fatima.zahra@casablanca.ma',
    'Pass Type': 'General Admission',
    'Notes / Group Affiliation': 'Individual Registration #118',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },
  {
    'Ticket ID': 'TEDX-2026-019',
    'Attendee Name': 'Dmitry Ivanov',
    'Email Address': 'dmitry.ivanov@telecom.ru',
    'Pass Type': 'General Admission',
    'Notes / Group Affiliation': 'Individual Registration #119',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },
  {
    'Ticket ID': 'TEDX-2026-020',
    'Attendee Name': 'Aiko Tanaka',
    'Email Address': 'aiko.tanaka@tokyo-arts.jp',
    'Pass Type': 'VIP Guest',
    'Notes / Group Affiliation': 'Art Curator Guest',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },

  // 21-22: Group Pass #2 (Design Studio - Expanded from 1 Form submission into 2 tickets)
  {
    'Ticket ID': 'TEDX-2026-021',
    'Attendee Name': 'Oliver Wright',
    'Email Address': 'oliver@craftstudio.co',
    'Pass Type': 'Group Pass',
    'Notes / Group Affiliation': 'Group Pass: Craft Studio Duo (Primary: Oliver Wright)',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },
  {
    'Ticket ID': 'TEDX-2026-022',
    'Attendee Name': 'Sophia Bell',
    'Email Address': 'sophia@craftstudio.co',
    'Pass Type': 'Group Pass',
    'Notes / Group Affiliation': 'Group Pass: Craft Studio Duo (Primary: Oliver Wright)',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },

  // 23-30: Varied Attendees, including real-world email edge cases (to test invalid email flagging)
  {
    'Ticket ID': 'TEDX-2026-023',
    'Attendee Name': 'Arthur Pendelton',
    'Email Address': 'arthur.pendelton@gmail', // Malformed (missing TLD) - preserve text, flag invalid
    'Pass Type': 'General Admission',
    'Notes / Group Affiliation': 'Phone: +1-555-0192 (Email needs confirmation)',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },
  {
    'Ticket ID': 'TEDX-2026-024',
    'Attendee Name': 'Mei-Ling Zhou',
    'Email Address': 'meiling.zhou@tsinghua.org.cn',
    'Pass Type': 'Speaker Pass',
    'Notes / Group Affiliation': 'Youth Speaker Spotlight',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },
  {
    'Ticket ID': 'TEDX-2026-025',
    'Attendee Name': 'Lucas Silva',
    'Email Address': 'lucas.silva@saopaulo.br',
    'Pass Type': 'General Admission',
    'Notes / Group Affiliation': 'Individual Registration #125',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },
  {
    'Ticket ID': 'TEDX-2026-026',
    'Attendee Name': 'Kavita Krishnan',
    'Email Address': 'kavitakrishnanyahoo.com', // Malformed (missing @) - preserve text, flag invalid
    'Pass Type': 'General Admission',
    'Notes / Group Affiliation': 'Registered on mobile',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },
  {
    'Ticket ID': 'TEDX-2026-027',
    'Attendee Name': 'Ibrahim Diallo',
    'Email Address': 'ibrahim.diallo@dakar-innov.sn',
    'Pass Type': 'General Admission',
    'Notes / Group Affiliation': 'Individual Registration #127',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },
  {
    'Ticket ID': 'TEDX-2026-028',
    'Attendee Name': 'Leila Haddad',
    'Email Address': 'leila.haddad@beirut-media.lb',
    'Pass Type': 'Media Pass',
    'Notes / Group Affiliation': 'Press Accreditation #04',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },
  {
    'Ticket ID': 'TEDX-2026-029',
    'Attendee Name': 'Viktor Novak',
    'Email Address': 'viktor.novak@prague-ventures.cz',
    'Pass Type': 'VIP Guest',
    'Notes / Group Affiliation': 'Sponsor Representative',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },
  {
    'Ticket ID': 'TEDX-2026-030',
    'Attendee Name': 'Grace Hopper Memorial Rep',
    'Email Address': '', // Missing email - preserve empty, flag for review
    'Pass Type': 'VIP Guest',
    'Notes / Group Affiliation': 'Direct ticket collection at front desk',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },

  // 31-33: Group Pass #3 (BioTech Lab - Expanded from 1 Form submission into 3 tickets)
  {
    'Ticket ID': 'TEDX-2026-031',
    'Attendee Name': 'Dr. Hans Richter',
    'Email Address': 'h.richter@genelabs.ch',
    'Pass Type': 'Group Pass',
    'Notes / Group Affiliation': 'Group Pass: GeneLabs Delegation (Lead: Dr. Hans Richter)',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },
  {
    'Ticket ID': 'TEDX-2026-032',
    'Attendee Name': 'Dr. Greta Weber',
    'Email Address': 'g.weber@genelabs.ch',
    'Pass Type': 'Group Pass',
    'Notes / Group Affiliation': 'Group Pass: GeneLabs Delegation (Lead: Dr. Hans Richter)',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },
  {
    'Ticket ID': 'TEDX-2026-033',
    'Attendee Name': 'Simon Wolf',
    'Email Address': 's.wolf@genelabs.ch',
    'Pass Type': 'Group Pass',
    'Notes / Group Affiliation': 'Group Pass: GeneLabs Delegation (Lead: Dr. Hans Richter)',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },

  // 34-40: General & Organizing Committee
  {
    'Ticket ID': 'TEDX-2026-034',
    'Attendee Name': 'Beatriz Morales',
    'Email Address': 'beatriz.morales@bogota-univ.co',
    'Pass Type': 'Student Pass',
    'Notes / Group Affiliation': 'Student ID Verified',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },
  {
    'Ticket ID': 'TEDX-2026-035',
    'Attendee Name': 'Kofi Mensah',
    'Email Address': 'kofi.mensah@accratech.gh',
    'Pass Type': 'General Admission',
    'Notes / Group Affiliation': 'Individual Registration #135',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },
  {
    'Ticket ID': 'TEDX-2026-036',
    'Attendee Name': 'Ananya Rao',
    'Email Address': 'ananya.rao@bengaluru-ai.in',
    'Pass Type': 'Organizing Committee',
    'Notes / Group Affiliation': 'Stage & Production Lead',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },
  {
    'Ticket ID': 'TEDX-2026-037',
    'Attendee Name': 'Leo Larsson',
    'Email Address': 'leo.larsson@stockholm-clean.se',
    'Pass Type': 'General Admission',
    'Notes / Group Affiliation': 'Individual Registration #137',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },
  {
    'Ticket ID': 'TEDX-2026-038',
    'Attendee Name': 'Sunita Deshmukh',
    'Email Address': 'sunita.d@mumbai-arts.in',
    'Pass Type': 'General Admission',
    'Notes / Group Affiliation': 'Individual Registration #138',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },
  {
    'Ticket ID': 'TEDX-2026-039',
    'Attendee Name': 'Patrick Murphy',
    'Email Address': 'patrick.murphy@dublin-iot.ie',
    'Pass Type': 'General Admission',
    'Notes / Group Affiliation': 'Individual Registration #139',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },
  {
    'Ticket ID': 'TEDX-2026-040',
    'Attendee Name': 'Siti Nurhaliza',
    'Email Address': 'siti.nurhaliza@kualalumpur.my',
    'Pass Type': 'Organizing Committee',
    'Notes / Group Affiliation': 'Attendee Experience Lead',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },

  // 41-42: Group Pass #4 (Robotics Duo - Expanded from 1 submission into 2 tickets)
  {
    'Ticket ID': 'TEDX-2026-041',
    'Attendee Name': 'Tatsuo Nomura',
    'Email Address': 'tatsuo@robotics-core.jp',
    'Pass Type': 'Group Pass',
    'Notes / Group Affiliation': 'Group Pass: Robotics Duo (Primary: Tatsuo Nomura)',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },
  {
    'Ticket ID': 'TEDX-2026-042',
    'Attendee Name': 'Yuki Kobayashi',
    'Email Address': 'yuki@robotics-core.jp',
    'Pass Type': 'Group Pass',
    'Notes / Group Affiliation': 'Group Pass: Robotics Duo (Primary: Tatsuo Nomura)',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },

  // 43-49: Final cohort to reach exactly 49 ledger records
  {
    'Ticket ID': 'TEDX-2026-043',
    'Attendee Name': 'Gabriel Santos',
    'Email Address': 'gabriel.santos@rio-media.br',
    'Pass Type': 'Media Pass',
    'Notes / Group Affiliation': 'Photo & Video Crew Accreditation',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },
  {
    'Ticket ID': 'TEDX-2026-044',
    'Attendee Name': 'Olga Koroleva',
    'Email Address': 'olga.koroleva@astronomy.org',
    'Pass Type': 'VIP Guest',
    'Notes / Group Affiliation': 'Guest of Astrophysics Speaker',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },
  {
    'Ticket ID': 'TEDX-2026-045',
    'Attendee Name': 'Kwame Osei',
    'Email Address': 'kwame.osei@africatech.ng',
    'Pass Type': 'General Admission',
    'Notes / Group Affiliation': 'Individual Registration #145',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },
  {
    'Ticket ID': 'TEDX-2026-046',
    'Attendee Name': 'Lars Lindqvist',
    'Email Address': 'lars.lindqvist@nordic-green.fi',
    'Pass Type': 'General Admission',
    'Notes / Group Affiliation': 'Individual Registration #146',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },
  {
    'Ticket ID': 'TEDX-2026-047',
    'Attendee Name': 'Prof. Miriam Green',
    'Email Address': 'miriam.green@oxford.ac.uk',
    'Pass Type': 'Speaker Pass',
    'Notes / Group Affiliation': 'Opening Keynote Speaker',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },
  {
    'Ticket ID': 'TEDX-2026-048',
    'Attendee Name': 'Mateo Fernandez',
    'Email Address': 'mateo.fernandez@buenosaires.ar',
    'Pass Type': 'General Admission',
    'Notes / Group Affiliation': 'Individual Registration #148',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },
  {
    'Ticket ID': 'TEDX-2026-049',
    'Attendee Name': 'Jessica Taylor',
    'Email Address': 'jessica.taylor@tedx-volunteer.org',
    'Pass Type': 'Organizing Committee',
    'Notes / Group Affiliation': 'Volunteer Coordinator & Gate Lead',
    'Approval Status': 'APPROVED_FOR_ISSUANCE',
  },
];

/**
 * Generates an XLSX workbook binary representing the Google Form responses & Ticket Ledger.
 * Sheet 1: "Form Responses 1" (43 submissions)
 * Sheet 2: "Ticket Ledger" (49 expanded attendee rows)
 */
export function generateSampleTEDxWorkbook(): Uint8Array {
  const wb = XLSX.utils.book_new();

  // Create Ticket Ledger sheet (49 rows)
  const wsLedger = XLSX.utils.json_to_sheet(SAMPLE_TEDX_LEDGER_DATA);
  XLSX.utils.book_append_sheet(wb, wsLedger, 'Ticket Ledger');

  // Create Form Responses sheet (43 submissions)
  // 39 single passes + 4 group submissions = 43 submissions
  const formSubmissions = SAMPLE_TEDX_LEDGER_DATA.filter((row) => {
    // Exclude the non-primary group members so form has 43 submissions
    const id = row['Ticket ID'];
    return !['TEDX-2026-012', 'TEDX-2026-013', 'TEDX-2026-022', 'TEDX-2026-032', 'TEDX-2026-033', 'TEDX-2026-042'].includes(id);
  }).map((row, idx) => ({
    'Timestamp': `2026-10-0${(idx % 8) + 1} 14:${(idx % 50) + 10}:00`,
    'Full Name': row['Attendee Name'],
    'Email Address': row['Email Address'],
    'Pass Type Selected': row['Pass Type'],
    'Payment Reference': `TXN-8849${idx}`,
    'Ledger Ticket ID Assigned': row['Ticket ID'],
  }));

  const wsForm = XLSX.utils.json_to_sheet(formSubmissions);
  XLSX.utils.book_append_sheet(wb, wsForm, 'Form Responses 1');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(wbout);
}

/**
 * Downloads the sample 49-record workbook to the organizer's browser
 */
export function downloadSampleWorkbook(fileName = 'TEDx_2026_Attendee_Ticket_Ledger.xlsx') {
  const data = generateSampleTEDxWorkbook();
  const blob = new Blob([data.buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
