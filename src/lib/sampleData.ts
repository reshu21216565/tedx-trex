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
  {
    "Ticket ID": "TEDX-2026-001",
    "Attendee Name": "Aman Kumar",
    "Email Address": "ashurock200208@gmail.com",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: 20200292490 | Other College: Institute of chartered accountants of India  | Course: Ca",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-002",
    "Attendee Name": "Gajula Tharun Kalyan",
    "Email Address": "gtk.edu23@gmail.com",
    "Pass Type": "Group Pass (Team Lead)",
    "Notes / Group Affiliation": "Group Lead | Txn: 627973581096 | Branch: CS, Roll: 25R11A62F3",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-003",
    "Attendee Name": "Yuvraj Chindam",
    "Email Address": "gtk.edu23@gmail.com",
    "Pass Type": "Group Pass (Member 2)",
    "Notes / Group Affiliation": "Group Member 2 | Lead: Gajula Tharun Kalyan | Roll: 25R11A62E4",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-004",
    "Attendee Name": "Mahammad Saad Mohsin",
    "Email Address": "gtk.edu23@gmail.com",
    "Pass Type": "Group Pass (Member 3)",
    "Notes / Group Affiliation": "Group Member 3 | Lead: Gajula Tharun Kalyan | Roll: 25R11A62G9",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-005",
    "Attendee Name": "R.Siri Chandana",
    "Email Address": "gtk.edu23@gmail.com",
    "Pass Type": "Group Pass (Member 4)",
    "Notes / Group Affiliation": "Group Member 4 | Lead: Gajula Tharun Kalyan | Roll: 25R11A62J4",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-006",
    "Attendee Name": "Kichhugari Chaitra",
    "Email Address": "kichhugarichaitra@gmail.com",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: T2610061756307389919213 | GCET Student | Branch: CS, Roll: 25R11A6230 ",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-007",
    "Attendee Name": "B Karthik",
    "Email Address": "karthikbanoth2517@gmail.com",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: T2610081849578809813990 | GCET Student | Branch: CS, Roll: 25R11A6206",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-008",
    "Attendee Name": "Sruthi Jammigumpula",
    "Email Address": "j28860318@gmail.com",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: 252492349525 | GCET Student | Branch: AIML, Roll: 25R11A6628",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-009",
    "Attendee Name": "L.N.C Siddhartha",
    "Email Address": "lncsiddhartha@gmail.com",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: 628297588140 | GCET Student | Branch: CSE, Roll: 25R11A0599",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-010",
    "Attendee Name": "S.Dhiraj Reddy",
    "Email Address": "dhirajseelam@gmail.com",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: T2610091246187257614237 | GCET Student | Branch: DS, Roll: 26R15A6713 ",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-011",
    "Attendee Name": "G.Srihitha",
    "Email Address": "srihitha071@gmail.com",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: T2610101011478632976330 | GCET Student | Branch: CS, Roll: 25R11A6218",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-012",
    "Attendee Name": "M.Shreya",
    "Email Address": "mahendrakar.shreya2007@gmail.com",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: T2610101020143467654028 | GCET Student | Branch: Pharmacy, Roll: 25z51r0025",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-013",
    "Attendee Name": "D Sri Laxmi Prasanna",
    "Email Address": "srilaxmiprasanna.d@gmail.com",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: T2610101038364006280147 | GCET Student | Branch: CSE, Roll: 23R11A05V6 ",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-014",
    "Attendee Name": "Bhuvana",
    "Email Address": "bhuvanavarma04@gmail.com",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: T2610101103253301792873 | Other College: Badruka College Of Commerce And Arts  | Course: B.com Business Analytics",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-015",
    "Attendee Name": "Pranav Tej Bonala",
    "Email Address": "pranavtej5@gmail.com",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: 664906264364 | GCET Student | Branch: ECE, Roll: 25R11A0450 ",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-016",
    "Attendee Name": "Peyyala Lokesh",
    "Email Address": "25r11a05b2@gcet.edu.in",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: T2610101205146260867297 | GCET Student | Branch: CSE, Roll: 25R11A05B2 ",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-017",
    "Attendee Name": "P.Vennela",
    "Email Address": "vennelaparchuri8121@gmail.com",
    "Pass Type": "Group Pass (Team Lead)",
    "Notes / Group Affiliation": "Group Lead | Txn: 628324928711 | Branch: ECE, Roll: 25R11A0446",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-018",
    "Attendee Name": "B. Manjusri",
    "Email Address": "25r11a0415@gcet.edu.in",
    "Pass Type": "Group Pass (Member 2)",
    "Notes / Group Affiliation": "Group Member 2 | Lead: P.Vennela | Roll: 25R11A0415 ",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-019",
    "Attendee Name": "B. Sharath kumar",
    "Email Address": "25r11a0415@gcet.edu.in",
    "Pass Type": "Group Pass (Member 3)",
    "Notes / Group Affiliation": "Group Member 3 | Lead: P.Vennela | Roll: 25R11A0414",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-020",
    "Attendee Name": "K. Sawaran teja",
    "Email Address": "25r11a0415@gcet.edu.in",
    "Pass Type": "Group Pass (Member 4)",
    "Notes / Group Affiliation": "Group Member 4 | Lead: P.Vennela | Roll: 25R11A0432",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-021",
    "Attendee Name": "Erukulla Vineet",
    "Email Address": "vineeterukulla@gmail.com",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: 628325111807 | GCET Student | Branch: CS, Roll: 24r11a62b0",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-022",
    "Attendee Name": "Ch.Nipun Sri Charan",
    "Email Address": "nipunsricharan@gmail.com",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: T2610101235295650772789 | GCET Student | Branch: CSE, Roll: 25R11A05DL",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-023",
    "Attendee Name": "Abhiram Aerukonda",
    "Email Address": "Hyderabad",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: 01a124a4-de7e-7692-8c1a-289eb054582a | GCET Student | Branch: CSE, Roll: 2511R05JC",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-024",
    "Attendee Name": "karthik",
    "Email Address": "karthiiik49@gmail.com",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: T2610101242523970594929 | GCET Student | Branch: CSE, Roll: 26r11a05p2 ",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-025",
    "Attendee Name": "K Tejaswini",
    "Email Address": "tejaswinikolukoppula@gmail.com",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: T2610101259269654157496 | Other College: NIATxAurora Deemed University  | Course: CSE AIML",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-026",
    "Attendee Name": "Oruganti Rahul",
    "Email Address": "Orugantirahul427@gmail.com",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: T2610101306085420772216 | GCET Student | Branch: AIML, Roll: 25R11A66G6",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-027",
    "Attendee Name": "Sowmitri Navaneeth",
    "Email Address": "sowmitrinavaneeth2@gmail.com",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: 628327645743 | GCET Student | Branch: CSE, Roll: 25r11a05ex",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-028",
    "Attendee Name": "Joshua vikshan",
    "Email Address": "joshua.vikshan@gmail.com",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: 01a124bd-b80f-7394-b7ba-600f49746040 | GCET Student | Branch: CSE, Roll: 26R11A05L9 ",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-029",
    "Attendee Name": "Lohan vaddepally",
    "Email Address": "lohanvaddepally777@gmail.com",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: T2610101319053815493725 | Working Professional | IT",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-030",
    "Attendee Name": "Ramcharan Sai",
    "Email Address": "Yrams1201@gmail.com",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: CICAgLim6vC9RQ | GCET Student | Branch: CSE, Roll: 25R11A05FF",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-031",
    "Attendee Name": "Munnangi Charita Grace",
    "Email Address": "charitagrace7@gmail.com",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: 628328564700 | GCET Student | Branch: CS, Roll: 24R11A62H6 ",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-032",
    "Attendee Name": "Sulegeme Pallavi",
    "Email Address": "vineeterukulla2620@gmail.com",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: 628328743606 | GCET Student | Branch: CSE, Roll: 24r11a0595",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-033",
    "Attendee Name": "Nikhitha Akula",
    "Email Address": "akula",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: T2610101342153178153205 | GCET Student | Branch: AIML, Roll: 25R116667",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-034",
    "Attendee Name": "Adukuri Shankar Srivathsa",
    "Email Address": "shankarsrivathsa.07@gmail.com",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: T2610101405035503972127 | GCET Student | Branch: AIML, Roll: 23R11A6602",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-035",
    "Attendee Name": "Abhinav",
    "Email Address": "Motukuriabhinav@gmail.com",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: 316570279642 | Other College: Vardhaman college of engineering | Course: Csd",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-036",
    "Attendee Name": "Raj thapaswin",
    "Email Address": "25r11a6290@gcet.edu.in",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: 01a12578-1736-7cc3-90cb-6c180774dcd8 | GCET Student | Branch: CS, Roll: 25R11A6290",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-037",
    "Attendee Name": "G.SriSai Charan",
    "Email Address": "srisaicharangurunatham@gmail.com",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: T2610101634539051654575 | GCET Student | Branch: CS, Roll: 25R11A62A3",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-038",
    "Attendee Name": "Akshaya Danthuri",
    "Email Address": "danthuriakshaya09@gmail.com",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: T2610101750088659009034 | GCET Student | Branch: AIML, Roll: 25R11A66U1 ",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-039",
    "Attendee Name": "ROHITH SRI SATYA RATUDU",
    "Email Address": "settyrohith8@gmail.com",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: 664940772407 | Other College: VBIT | Course: DATA SCIENCE ",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-040",
    "Attendee Name": "Yellaturu Hitaishi",
    "Email Address": "hitaishi2201@gmail.com",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: T2610101842110352298938 | GCET Student | Branch: CSE, Roll: 25R11A05JB",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-041",
    "Attendee Name": "Mahitha Munnangi",
    "Email Address": "munnangimahitha@gmail.com",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: T2610101911007763259523 | Other College: Keshav Memorial College of Law, Hyderabad. | Course: BBA/LLB",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-042",
    "Attendee Name": "Sri nitya",
    "Email Address": "nityaerramilli@gmail.com",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: T2610101923145471360821 | GCET Student | Branch: CSE, Roll: 25r11a05e3",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-043",
    "Attendee Name": "Anantha Parasar",
    "Email Address": "parasaranantha@gmail.com",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: T2610102121522648042044 | Other College: CMR Engineering College  | Course: Electronics and communication engineering ",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-044",
    "Attendee Name": "M.vaishnavi",
    "Email Address": "Madhukuntevaishnavi@gmail.com",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: T2610102238064278596160 | GCET Student | Branch: AIML, Roll: 25R11A66A0 ",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-045",
    "Attendee Name": "Mohammed Tafazzul Ahmed",
    "Email Address": "tafazzul.13a@gmail.com",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: UPI Ref No:316617520935 | GCET Student | Branch: AIML, Roll: 25R11A66P0",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-046",
    "Attendee Name": "Y. Madhu sri",
    "Email Address": "yaparimadhusri05@gmail.com",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: ******5219@icici | GCET Student | Branch: AIML, Roll: 25R11A66C6 ",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-047",
    "Attendee Name": "Nikhilesh Lingampally",
    "Email Address": "lnb2603@gmail.com",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: T2610111015017117740128 | GCET Student | Branch: ECE, Roll: 25R11A04A2 ",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-048",
    "Attendee Name": "Dinesh",
    "Email Address": "dineshsaiyellanki@gmail.com",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: 628480488373 | GCET Student | Branch: AIML, Roll: 23R11A6613",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-049",
    "Attendee Name": "D Shantan Dheer",
    "Email Address": "shantandheerd@gmail.com",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: 121134137595 | GCET Student | Branch: EEE, Roll: 25R11A0215",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-050",
    "Attendee Name": "Singamsetti Lakshmi Deepika",
    "Email Address": "slakshmideepika@gmail.com",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: T2610111536480932916908 | GCET Student | Branch: CS, Roll: 25r11a62c1 ",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-051",
    "Attendee Name": "Abhinav Tej",
    "Email Address": "chintu777000@gmail.com",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: T2610111540203244318343 | GCET Student | Branch: AIML, Roll: 24R11A6616",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-052",
    "Attendee Name": "Y.Sai Krishna",
    "Email Address": "yachamsaikrishna2006@gmail.com",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: T2610111545242251813147 | GCET Student | Branch: AIML, Roll: 24R11A6651",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-053",
    "Attendee Name": "Satya Sri Chaitanya",
    "Email Address": "satyasrichaitanya360@gmail.com",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: 01a12abf-397e-7570-8999-963bb38e2a95 | GCET Student | Branch: ECE, Roll: 25R11A0479",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-054",
    "Attendee Name": "Varun minna",
    "Email Address": "varunminna22@gmail.com",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: 131110343562 | Working Professional | Bba graduate ",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-055",
    "Attendee Name": "Pooja",
    "Email Address": "Poojaminna2203@gmail.com",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: 665005870253 | Working Professional | Software engineer ",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  },
  {
    "Ticket ID": "TEDX-2026-056",
    "Attendee Name": "G. Anjalee Gayathri",
    "Email Address": "anjaleeg99@gmail.com",
    "Pass Type": "General Admission",
    "Notes / Group Affiliation": "Txn: 628460800623 | GCET Student | Branch: ECE, Roll: 25R11A0483",
    "Approval Status": "APPROVED_FOR_ISSUANCE"
  }
];

export function generateSampleExcelFile(): Uint8Array {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(SAMPLE_TEDX_LEDGER_DATA);
  XLSX.utils.book_append_sheet(wb, ws, 'Ticket Ledger');
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(buffer);
}

export function downloadSampleWorkbook(fileName: string = 'TEDx_Official_Ticket_Ledger.xlsx'): void {
  const data = generateSampleExcelFile();
  const blob = new Blob([data as unknown as BlobPart], {
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
