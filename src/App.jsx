import React, { useState, useEffect, useCallback } from 'react';
import Papa from 'papaparse';
import { User, RefreshCcw, ChevronLeft } from 'lucide-react';

// [시트 설정] - 질문 시트만 사용합니다.
const QUESTION_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQw9qbxyj6z7z88VGTMXOtXMFU09MuE3U7ekxOToeA9axoovVZLHrJMEIQcz30rWHqLUVlToyOYvQBl/pub?gid=239825276&single=true&output=csv';

const TYPE_COLORS = {
  '냉정': '#2563eb', '광기': '#dc2626', '활발': '#eab308', '우울': '#9333ea', '순수': '#16a34a', '기타': '#78716c',
  '공명': 'linear-gradient(90deg, #ffadad, #ffd6a5, #fdffb6, #caffbf, #9bf6ff, #a0c4ff, #bdb2ff, #ffc6ff)'
};

const HUNGEUL_STYLE = { fontFamily: 'Hungeul, sans-serif', fontWeight: 'normal' };

function App() {
  const [data, setData] = useState([]);
  const [charGroups, setCharGroups] = useState({});
  const [selectedChar, setSelectedChar] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const t = new Date().getTime();
    try {
      // 이제 질문 데이터만 파싱하면 됩니다.
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
  const headerBg = charBase?.type === '공명' ? TYPE_COLORS['공명'] : (charBase ? TYPE_COLORS[charBase.type] : '#000');

  // 이미지 경로 생성 함수 (파일명에 공백이 있을 수 있으니 encodeURIComponent 처리)
  const getCharImgPath = (name) => `/images/${name}.png`;

  if (loading) return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>데이터 동기화 중...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100vh', backgroundColor: '#e5e7eb', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      
      {(!isMobile || (isMobile && !selectedChar)) && (
        <aside style={{ width: isMobile ? '100%' : '320px', height: '100%', backgroundColor: '#fff', borderRight: isMobile ? 'none' : '4px solid #000', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '20px', backgroundColor: '#f59e0b', borderBottom: '4px solid #000', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h1 style={{ ...HUNGEUL_STYLE, fontSize: '22px', margin: 0 }}>트릭컬 연회 공략집</h1>
              <button onClick={fetchData} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><RefreshCcw size={20} /></button>
            </div>
            <input type="text" placeholder="사도 이름 검색..." style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '2px solid #000', outline: 'none', color: '#000', boxSizing: 'border-box' }} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1 }}>
              {Object.keys(charGroups).map(type => {
                const chars = charGroups[type].filter(c => c.includes(searchTerm));
                if (chars.length === 0) return null;
                return (
                  <div key={type} style={{ border: '3px solid #000', borderRadius: '12px', marginBottom: '20px', overflow: 'hidden', backgroundColor: '#fff', boxShadow: '4px 4px 0px 0px #000' }}>
                    <div style={{ padding: '6px', fontSize: '13px', fontWeight: '900', color: type === '공명' ? '#333' : '#fff', background: type === '공명' ? TYPE_COLORS['공명'] : (TYPE_COLORS[type] || '#78716c'), textAlign: 'center', borderBottom: '3px solid #000' }}>{type}</div>
                    <div style={{ padding: '8px', display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)', gap: '8px' }}>
                      {chars.map(name => (
                        <button key={name} onClick={() => setSelectedChar(name)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px', border: '2px solid #000', borderRadius: '8px', backgroundColor: selectedChar === name ? '#fef3c7' : '#fff', cursor: 'pointer' }}>
                          <div style={{ width: '45px', height: '45px', borderRadius: '50%', marginBottom: '6px', border: '2px solid #000', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#eee' }}>
                            <img 
                                src={getCharImgPath(name)} 
                                alt="" 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/45?text=?'; }}
                            />
                          </div>
                          <span style={{ ...HUNGEUL_STYLE, fontSize: '14px' }}>{name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: '20px 0', textAlign: 'center', color: '#999', fontSize: '11px', fontWeight: 'bold' }}>All images copyright EPIDGames</div>
          </div>
        </aside>
      )}

      {(!isMobile || (isMobile && selectedChar)) && (
        <main style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '15px' : '40px' }}>
          {selectedChar ? (
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
              <div style={{ backgroundColor: '#fff', border: '5px solid #000', boxShadow: isMobile ? '8px 8px 0px 0px #000' : '15px 15px 0px 0px #000', marginBottom: '20px' }}>
                {isMobile && (
                  <button onClick={() => setSelectedChar(null)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '12px', background: '#000', color: '#fff', border: 'none', width: '100%', cursor: 'pointer', fontWeight: 'bold' }}><ChevronLeft size={20} /> 목록으로 돌아가기</button>
                )}
                <div style={{ padding: '25px', color: charBase?.type === '공명' ? '#333' : '#fff', borderBottom: '5px solid #000', background: headerBg, display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ width: isMobile ? '60px' : '80px', height: isMobile ? '60px' : '80px', border: '4px solid #fff', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img 
                        src={getCharImgPath(selectedChar)} 
                        alt="" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/80?text=?'; }}
                    />
                  </div>
                  <h2 style={{ ...HUNGEUL_STYLE, fontSize: isMobile ? '32px' : '48px', margin: 0 }}>{selectedChar}</h2>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#000', color: '#fff' }}>
                      <th style={{ padding: '15px', borderRight: '3px solid #000', width: '55%', fontSize: isMobile ? '14px' : '16px' }}>연회 질문 내용</th>
                      <th style={{ padding: '15px', width: '45%', fontSize: isMobile ? '14px' : '16px' }}>3점 추천 답변</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLines.map((line, idx) => (
                      <tr key={idx} style={{ borderBottom: '3px solid #000' }}>
                        <td style={{ padding: isMobile ? '15px' : '25px', fontSize: isMobile ? '14px' : '17px', fontWeight: 'bold', borderRight: '3px solid #000', backgroundColor: '#fffde6', wordBreak: 'keep-all' }}>{line.question}</td>
                        <td style={{ padding: isMobile ? '15px' : '25px', fontSize: isMobile ? '15px' : '18px', fontWeight: '900', backgroundColor: '#f0fff4', textAlign: 'center', color: '#14532d', wordBreak: 'keep-all' }}>{line.answer}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ textAlign: 'center', color: '#999', fontSize: '11px', fontWeight: 'bold', paddingBottom: '30px' }}>All images copyright EPIDGames</div>
            </div>
          ) : (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.1 }}>
              <User size={150} /><p style={{ fontSize: '32px', fontWeight: '900' }}>사도를 선택해 주세요</p>
            </div>
          )}
        </main>
      )}
    </div>
  );
}

export default App;
