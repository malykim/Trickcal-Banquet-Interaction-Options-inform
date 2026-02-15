import React, { useState, useEffect, useCallback } from 'react';
import Papa from 'papaparse';
import { User, RefreshCcw } from 'lucide-react';

// [시트 설정]
const QUESTION_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQw9qbxyj6z7z88VGTMXOtXMFU09MuE3U7ekxOToeA9axoovVZLHrJMEIQcz30rWHqLUVlToyOYvQBl/pub?gid=239825276&single=true&output=csv';
const IMAGE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQw9qbxyj6z7z88VGTMXOtXMFU09MuE3U7ekxOToeA9axoovVZLHrJMEIQcz30rWHqLUVlToyOYvQBl/pub?gid=1006383495&single=true&output=csv';

const TYPE_COLORS = {
  '냉정': '#2563eb', 
  '광기': '#dc2626', 
  '활발': '#eab308', 
  '우울': '#9333ea', 
  '순수': '#16a34a', 
  '기타': '#78716c',
  '공명': 'linear-gradient(90deg, #ffadad, #ffd6a5, #fdffb6, #caffbf, #9bf6ff, #a0c4ff, #bdb2ff, #ffc6ff)'
};

function App() {
  const [data, setData] = useState([]);
  const [images, setImages] = useState({});
  const [charGroups, setCharGroups] = useState({});
  const [selectedChar, setSelectedChar] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // 화면 크기 체크 리스너
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const t = new Date().getTime();
    try {
      const imageRes = await new Promise((resolve) => {
        Papa.parse(`${IMAGE_SHEET_URL}&t=${t}`, {
          download: true, header: false,
          complete: (results) => {
            const map = {};
            results.data.forEach(row => {
              const name = row[0]?.trim();
              const link = row[1]?.trim();
              if (name && link) map[name] = link;
            });
            resolve(map);
          }
        });
      });
      setImages(imageRes);

      Papa.parse(`${QUESTION_SHEET_URL}&t=${t}`, {
        download: true, header: false, skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data;
          let currentName = ""; let currentType = "기타"; let lastQuestion = "";
          const refined = []; const groups = {};
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length < 2) continue;
            if (row[0]?.trim()) currentName = row[0].trim();
            if (row[4]?.trim()) currentType = row[4].trim();
            if (row[1]?.trim()) lastQuestion = row[1].trim();
            if (currentName) {
              if (!groups[currentType]) groups[currentType] = new Set();
              groups[currentType].add(currentName);
            }
            if (row[3]?.trim() === "3" && lastQuestion && row[2]?.trim() && currentName) {
              refined.push({ charName: currentName, question: lastQuestion, answer: row[2].trim(), type: currentType });
            }
          }
          const finalGroups = {};
          Object.keys(groups).sort().forEach(t => finalGroups[t] = Array.from(groups[t]).sort());
          setCharGroups(finalGroups);
          setData(refined);
          setLoading(false);
        }
      });
    } catch (err) { console.error(err); setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredLines = data.filter(item => item.charName === selectedChar);
  const charBase = data.find(d => d.charName === selectedChar);
  const charImg = images[selectedChar] || "";
  const headerBg = charBase?.type === '공명' ? TYPE_COLORS['공명'] : (charBase ? TYPE_COLORS[charBase.type] : '#000');

  if (loading) return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>데이터 동기화 중...</div>;

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: isMobile ? 'column' : 'row', 
      height: '100vh', 
      backgroundColor: '#e5e7eb', 
      fontFamily: 'sans-serif', 
      overflow: 'hidden' 
    }}>
      
      {/* Sidebar (PC: 왼쪽, Mobile: 상단) */}
      <aside style={{ 
        width: isMobile ? '100%' : '320px', 
        height: isMobile ? '40vh' : '100%',
        backgroundColor: '#fff', 
        borderRight: isMobile ? 'none' : '4px solid #000',
        borderBottom: isMobile ? '4px solid #000' : 'none',
        display: 'flex', 
        flexDirection: 'column', 
        flexShrink: 0 
      }}>
        <div style={{ padding: isMobile ? '10px 15px' : '20px', backgroundColor: '#f59e0b', borderBottom: '4px solid #000', color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h1 style={{ fontSize: isMobile ? '14px' : '16px', fontWeight: '900', margin: 0 }}>트릭컬 연회 공략집</h1>
            <button onClick={fetchData} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><RefreshCcw size={isMobile ? 18 : 20} /></button>
          </div>
          <input 
            type="text" 
            placeholder="사도 이름 검색..." 
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '2px solid #000', outline: 'none', color: '#000', boxSizing: 'border-box' }} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
          {Object.keys(charGroups).map(type => {
            const chars = charGroups[type].filter(c => c.includes(searchTerm));
            if (chars.length === 0) return null;
            return (
              <div key={type} style={{ border: '2px solid #000', borderRadius: '8px', marginBottom: '15px', overflow: 'hidden', backgroundColor: '#fff', boxShadow: '3px 3px 0px 0px #000' }}>
                <div style={{ 
                  padding: '4px', fontSize: '11px', fontWeight: '900', 
                  color: type === '공명' ? '#333' : '#fff', 
                  background: type === '공명' ? TYPE_COLORS['공명'] : (TYPE_COLORS[type] || '#78716c'), 
                  textAlign: 'center', borderBottom: '2px solid #000' 
                }}>{type}</div>
                <div style={{ 
                  padding: '6px', display: 'grid', 
                  gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)', 
                  gap: '6px' 
                }}>
                  {chars.map(name => (
                    <button key={name} onClick={() => setSelectedChar(name)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6px 4px', border: '1px solid #000', borderRadius: '6px', backgroundColor: selectedChar === name ? '#fef3c7' : '#fff', cursor: 'pointer' }}>
                      <div style={{ width: isMobile ? '35px' : '45px', height: isMobile ? '35px' : '45px', borderRadius: '50%', marginBottom: '4px', border: '1px solid #000', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#eee' }}>
                        {images[name] ? <img src={images[name]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={isMobile ? 15 : 20} color="#ccc" />}
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'center' }}>{name}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main Content (PC: 오른쪽, Mobile: 하단) */}
      <main style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '15px' : '40px' }}>
        {selectedChar ? (
          <div style={{ maxWidth: '900px', margin: '0 auto', backgroundColor: '#fff', border: isMobile ? '3px solid #000' : '5px solid #000', boxShadow: isMobile ? '6px 6px 0px 0px #000' : '15px 15px 0px 0px #000' }}>
            <div style={{ 
              padding: isMobile ? '15px' : '30px', 
              color: charBase?.type === '공명' ? '#333' : '#fff', 
              borderBottom: isMobile ? '3px solid #000' : '5px solid #000', 
              background: headerBg, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '15px' 
            }}>
              <div style={{ width: isMobile ? '50px' : '80px', height: isMobile ? '50px' : '80px', border: '3px solid #fff', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {charImg ? <img src={charImg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={isMobile ? 25 : 40} color="#000" />}
              </div>
              <h2 style={{ fontSize: isMobile ? '24px' : '40px', fontWeight: '900', margin: 0 }}>{selectedChar}</h2>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ backgroundColor: '#000', color: '#fff' }}>
                  <th style={{ padding: isMobile ? '10px' : '15px', borderRight: isMobile ? '2px solid #000' : '5px solid #000', width: '50%', fontSize: isMobile ? '12px' : '16px' }}>질문</th>
                  <th style={{ padding: isMobile ? '10px' : '15px', width: '50%', fontSize: isMobile ? '12px' : '16px' }}>3점 답변</th>
                </tr>
              </thead>
              <tbody>
                {filteredLines.map((line, idx) => (
                  <tr key={idx} style={{ borderBottom: isMobile ? '2px solid #000' : '5px solid #000' }}>
                    <td style={{ padding: isMobile ? '12px' : '25px', fontSize: isMobile ? '13px' : '17px', fontWeight: 'bold', borderRight: isMobile ? '2px solid #000' : '5px solid #000', backgroundColor: '#fffde6', wordBreak: 'keep-all' }}>{line.question}</td>
                    <td style={{ padding: isMobile ? '12px' : '25px', fontSize: isMobile ? '14px' : '18px', fontWeight: '900', backgroundColor: '#f0fff4', textAlign: 'center', color: '#14532d', wordBreak: 'keep-all' }}>{line.answer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.1 }}>
            <User size={isMobile ? 80 : 150} />
            <p style={{ fontSize: isMobile ? '20px' : '32px', fontWeight: '900' }}>사도를 선택해 주세요</p>
          </div>
        )}
        {/* 모바일 하단 여백 확보 */}
        {isMobile && <div style={{ height: '40px' }} />}
      </main>
    </div>
  );
}

export default App;
