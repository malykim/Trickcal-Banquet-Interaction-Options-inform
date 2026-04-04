import React, { useState, useEffect, useCallback } from 'react';
import Papa from 'papaparse';
import { User, RefreshCcw, ChevronLeft, Type } from 'lucide-react';

const QUESTION_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQw9qbxyj6z7z88VGTMXOtXMFU09MuE3U7ekxOToeA9axoovVZLHrJMEIQcz30rWHqLUVlToyOYvQBl/pub?gid=239825276&single=true&output=csv';

// 한글 자음/모음 분해 함수
const decomposeHangul = (str) => {
  if (!str) return "";
  const CHOSUNG = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  const JUNGSUNG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
  const JONGSUNG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

  let result = "";
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i) - 44032;
    if (code > -1 && code < 11172) {
      const cho = Math.floor(code / 588);
      const jung = Math.floor((code % 588) / 28);
      const jong = code % 28;
      result += CHOSUNG[cho] + JUNGSUNG[jung] + (JONGSUNG[jong] || "");
    } else {
      result += str[i];
    }
  }
  return result;
};

// 초성만 추출하는 함수 (띄어쓰기 유지)
const getChosung = (str) => {
  if (!str) return "";
  const CHOSUNG = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  let result = "";
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i) - 44032;
    if (code >= 0 && code <= 11171) {
      result += CHOSUNG[Math.floor(code / 588)];
    } else {
      result += str[i];
    }
  }
  return result;
};

const TYPE_COLORS = {
  '냉정': '#2563eb', '광기': '#dc2626', '활발': '#eab308', '우울': '#9333ea', '순수': '#16a34a', '기타': '#78716c',
  '공명': 'linear-gradient(90deg, #ffadad, #ffd6a5, #fdffb6, #caffbf, #9bf6ff, #a0c4ff, #bdb2ff, #ffc6ff)'
};

function App() {
  const [data, setData] = useState([]);
  const [charGroups, setCharGroups] = useState({});
  const [selectedChar, setSelectedChar] = useState(null);
  const [highlightedQuestion, setHighlightedQuestion] = useState(null); // 하이라이트 상태 추가
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState('char');
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  const [isHungeul, setIsHungeul] = useState(() => {
    const saved = localStorage.getItem('font-setting');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // 🔄 브라우저 뒤로가기(History API) 제어
  useEffect(() => {
    const handlePopState = (e) => {
      if (e.state && e.state.page === 'detail') {
        setSelectedChar(e.state.char);
      } else {
        setSelectedChar(null);
        setHighlightedQuestion(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // 사도 선택 (뒤로가기 기록 남기기 포함)
  const handleCharSelect = (name, question = null) => {
    if (selectedChar !== name) {
      window.history.pushState({ page: 'detail', char: name }, '', '');
    }
    setSelectedChar(name);
    setHighlightedQuestion(question);
  };

  useEffect(() => {
    localStorage.setItem('font-setting', JSON.stringify(isHungeul));
  }, [isHungeul]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ✨ 자동 스크롤 기능
  useEffect(() => {
    if (highlightedQuestion) {
      setTimeout(() => {
        const el = document.getElementById('highlighted-row');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [highlightedQuestion, selectedChar]);

  const getFontStyle = (isTitle = false) => ({
    fontFamily: isHungeul ? 'Hungeul, sans-serif' : 'sans-serif',
    fontWeight: isHungeul ? 'normal' : (isTitle ? '900' : 'bold'),
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const t = new Date().getTime();
    try {
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
              // 🚀 속도 최적화: 데이터를 불러올 때 미리 자모 분해 & 초성을 계산해 둠!
              refined.push({ 
                charName: currentName, 
                question: lastQuestion, 
                answer: row[2].trim(), 
                type: currentType,
                decomposedQ: decomposeHangul(lastQuestion.toLowerCase()),
                chosungQ: getChosung(lastQuestion.toLowerCase())
              });
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

  const getCharImgPath = (name) => {
    const now = new Date();
    const isAprilFool = now.getMonth() === 3 && now.getDate() === 1;
    const folder = isAprilFool ? 'images_BV' : 'images';
    return `/${folder}/${name}.png`;
  };

  // 🚀 검색어 미리 계산 (렌더링 속도 최적화)
  const lowerSearch = searchTerm.toLowerCase();
  const decomposedSearch = decomposeHangul(lowerSearch);
  const isChosungSearch = /^([ㄱ-ㅎ\s]+)$/.test(lowerSearch);
  // '이리' 처럼 단어의 첫 초성이 맞는지 검사하는 정규식 (^ 또는 띄어쓰기 뒤에 초성이 오는지)
  const chosungRegex = isChosungSearch ? new RegExp(`(^|\\s)${lowerSearch.trim()}`) : null;

  // 💬 대사 검색 필터링 로직 (최적화 완료)
  const filteredDialogues = searchMode === 'dialogue' && searchTerm
    ? data.filter(item => {
        if (isChosungSearch) return chosungRegex.test(item.chosungQ);
        return item.decomposedQ.includes(decomposedSearch);
      })
    : [];

  if (loading) return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>데이터 동기화 중...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100vh', backgroundColor: '#e5e7eb', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      
      {/* ✨ 형광펜 하이라이트 애니메이션 스타일 */}
      <style>
        {`
          @keyframes highlightFlash {
            0% { background-color: #fef08a; }
            50% { background-color: #a3e635; }
            100% { background-color: #fef08a; }
          }
          .highlighted-td {
            animation: highlightFlash 1.5s infinite alternate !important;
            color: #000 !important;
          }
        `}
      </style>

      {(!isMobile || (isMobile && !selectedChar)) && (
        <aside style={{ width: isMobile ? '100%' : '320px', height: '100%', backgroundColor: '#fff', borderRight: isMobile ? 'none' : '4px solid #000', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '20px', backgroundColor: '#f59e0b', borderBottom: '4px solid #000', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h1 style={{ ...getFontStyle(true), fontSize: '18px', margin: 0 }}>트릭컬 연회장 공략집</h1>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setIsHungeul(!isHungeul)} title="폰트 변경" style={{ background: '#fff', border: '2px solid #000', color: '#000', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Type size={18} /></button>
                <button onClick={fetchData} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><RefreshCcw size={20} /></button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <button onClick={() => { setSearchMode('char'); setSearchTerm(''); }} style={{ ...getFontStyle(), flex: 1, padding: '8px', background: searchMode === 'char' ? '#fff' : 'transparent', color: searchMode === 'char' ? '#f59e0b' : '#fff', border: searchMode === 'char' ? '2px solid #000' : '2px solid #fff', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>👤 사도 검색</button>
              <button onClick={() => { setSearchMode('dialogue'); setSearchTerm(''); }} style={{ ...getFontStyle(), flex: 1, padding: '8px', background: searchMode === 'dialogue' ? '#fff' : 'transparent', color: searchMode === 'dialogue' ? '#f59e0b' : '#fff', border: searchMode === 'dialogue' ? '2px solid #000' : '2px solid #fff', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>💬 대사 검색</button>
            </div>

            <input type="text" placeholder={searchMode === 'char' ? "사도 이름 검색..." : "대사 내용 검색..."} value={searchTerm} style={{ ...getFontStyle(), width: '100%', padding: '10px', borderRadius: '4px', border: '2px solid #000', outline: 'none', color: '#000', boxSizing: 'border-box' }} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', backgroundColor: searchMode === 'dialogue' ? '#f3f4f6' : '#fff' }}>
            
            {/* 👤 사도 검색 화면 */}
            {searchMode === 'char' && Object.keys(charGroups).map(type => {
              const chars = charGroups[type].filter(name => {
                if (!searchTerm) return true;
                const lowerName = name.toLowerCase();
                if (isChosungSearch) return getChosung(lowerName).includes(lowerSearch);
                return decomposeHangul(lowerName).includes(decomposedSearch);
              });
              
              if (chars.length === 0) return null;

              return (
                <div key={type} style={{ border: '3px solid #000', borderRadius: '12px', marginBottom: '20px', overflow: 'hidden', backgroundColor: '#fff', boxShadow: '4px 4px 0px 0px #000' }}>
                  <div style={{ ...getFontStyle(true), padding: '6px', fontSize: '15px', color: type === '공명' ? '#333' : '#fff', background: type === '공명' ? TYPE_COLORS['공명'] : (TYPE_COLORS[type] || '#78716c'), textAlign: 'center', borderBottom: '3px solid #000' }}>{type}</div>
                  <div style={{ padding: '8px', display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)', gap: '8px' }}>
                    {chars.map(name => (
                      <button key={name} onClick={() => handleCharSelect(name)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px', border: '2px solid #000', borderRadius: '8px', backgroundColor: selectedChar === name ? '#fef3c7' : '#fff', cursor: 'pointer' }}>
                        <div style={{ width: '45px', height: '45px', borderRadius: '50%', marginBottom: '6px', border: '2px solid #000', overflow: 'hidden', backgroundColor: '#eee' }}>
                          <img src={getCharImgPath(name)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.src = 'https://via.placeholder.com/45?text=?'; }} />
                        </div>
                        <span style={{ ...getFontStyle(), fontSize: '14px' }}>{name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* 💬 대사 검색 화면 */}
            {searchMode === 'dialogue' && (
              <>
                {!searchTerm ? (
                  <div style={{ ...getFontStyle(), textAlign: 'center', color: '#6b7280', marginTop: '40px' }}>검색할 대사를 입력해 주세요.</div>
                ) : filteredDialogues.length === 0 ? (
                  <div style={{ ...getFontStyle(), textAlign: 'center', color: '#6b7280', marginTop: '40px' }}>일치하는 대사가 없습니다.</div>
                ) : (
                  filteredDialogues.map((item, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => handleCharSelect(item.charName, item.question)} 
                      style={{ border: '3px solid #000', borderRadius: '8px', marginBottom: '12px', backgroundColor: '#fff', padding: '12px', cursor: 'pointer', boxShadow: '3px 3px 0px 0px #000', transition: 'transform 0.1s' }}
                      onMouseDown={(e) => e.currentTarget.style.transform = 'translate(2px, 2px)'}
                      onMouseUp={(e) => e.currentTarget.style.transform = 'none'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', borderBottom: '2px dashed #e5e7eb', paddingBottom: '8px' }}>
                        <img src={getCharImgPath(item.charName)} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #000', backgroundColor: '#eee' }} onError={(e) => { e.target.src = 'https://via.placeholder.com/32?text=?'; }} />
                        <span style={{ ...getFontStyle(), fontWeight: 'bold', fontSize: '15px' }}>{item.charName}</span>
                      </div>
                      <div style={{ ...getFontStyle(), fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#b91c1c', wordBreak: 'keep-all', lineHeight: '1.4' }}>
                        <span style={{ color: '#000', marginRight: '4px' }}>Q.</span>{item.question}
                      </div>
                      <div style={{ ...getFontStyle(), fontSize: '15px', fontWeight: '900', color: '#15803d', wordBreak: 'keep-all', lineHeight: '1.4', backgroundColor: '#f0fff4', padding: '6px', borderRadius: '4px', border: '1px solid #bbf7d0' }}>
                        <span style={{ color: '#000', marginRight: '4px' }}>A.</span>{item.answer}
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </aside>
      )}
      
      {(!isMobile || (isMobile && selectedChar)) && (
        <main style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '15px' : '40px', scrollBehavior: 'smooth' }}>
          {selectedChar ? (
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
              <div style={{ backgroundColor: '#fff', border: '5px solid #000', boxShadow: isMobile ? '8px 8px 0px 0px #000' : '15px 15px 0px 0px #000', marginBottom: '20px' }}>
                {isMobile && (
                  <button onClick={() => window.history.back()} style={{ ...getFontStyle(), display: 'flex', alignItems: 'center', gap: '5px', padding: '12px', background: '#000', color: '#fff', border: 'none', width: '100%', cursor: 'pointer', fontWeight: 'bold' }}><ChevronLeft size={20} /> 목록으로 돌아가기</button>
                )}
                <div style={{ padding: '25px', color: charBase?.type === '공명' ? '#333' : '#fff', borderBottom: '5px solid #000', background: headerBg, display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ width: isMobile ? '60px' : '80px', height: isMobile ? '60px' : '80px', border: '4px solid #fff', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#fff' }}>
                    <img src={getCharImgPath(selectedChar)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.src = 'https://via.placeholder.com/80?text=?'; }} />
                  </div>
                  <h2 style={{ ...getFontStyle(true), fontSize: isMobile ? '32px' : '48px', margin: 0 }}>{selectedChar}</h2>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#000', color: '#fff' }}>
                      <th style={{ padding: '15px', borderRight: '3px solid #000', width: '55%' }}>사도의 질문</th>
                      <th style={{ padding: '15px', width: '45%' }}>교주의 답변</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLines.map((line, idx) => {
                      const isHighlighted = line.question === highlightedQuestion;
                      return (
                        <tr 
                          key={idx} 
                          id={isHighlighted ? 'highlighted-row' : `row-${idx}`}
                          style={{ borderBottom: isHighlighted ? '5px solid #16a34a' : '3px solid #000' }}
                        >
                          <td className={isHighlighted ? 'highlighted-td' : ''} style={{ ...getFontStyle(), padding: isMobile ? '15px' : '25px', fontSize: isMobile ? '14px' : '17px', fontWeight: 'bold', borderRight: '3px solid #000', backgroundColor: isHighlighted ? '#a3e635' : '#fffde6', wordBreak: 'keep-all' }}>{line.question}</td>
                          <td className={isHighlighted ? 'highlighted-td' : ''} style={{ ...getFontStyle(), padding: isMobile ? '15px' : '25px', fontSize: isMobile ? '15px' : '18px', fontWeight: '900', backgroundColor: isHighlighted ? '#86efac' : '#f0fff4', textAlign: 'center', color: '#14532d', wordBreak: 'keep-all' }}>{line.answer}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
