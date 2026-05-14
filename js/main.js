// ========= 第一部分：原有图表数据依赖 (data.js) =========
  const D = window.SONGCI_FOOD_DATA;
  if(!D) console.warn("未找到 data.js，请确保文件和变量SONGCI_FOOD_DATA存在");
  const fmt = n => Number(n).toLocaleString("zh-CN");
  function setText(id,val){ let el=document.getElementById(id); if(el) el.textContent=val; }
  if(D){
    setText("mFoodPoems", fmt(D.overview.foodPoems));
    setText("mFoodAuthors", fmt(D.overview.foodAuthors));
    setText("mFoodRhythmics", fmt(D.overview.foodRhythmics));
    setText("mFoodHits", fmt(D.overview.foodHits));
    setText("mTotalPoems", fmt(D.overview.totalPoems));
    setText("mTotalAuthors", fmt(D.overview.totalAuthors));
    setText("mTotalRhythmics", fmt(D.overview.totalRhythmics));
    setText("mCoverage", D.overview.coverage + "%");
  }
  const chartText = { color: "#1f2522", fontFamily: "Noto Serif SC, Songti SC, Microsoft YaHei, serif" };
  const categoryColors = {
    "酒文化":"#D4843A",
    "食物本体":"#8CB36C",
    "茶与其他饮品":"#A7B86C",
    "饮食器物与烹饪":"#C2635D"
  };
  function initChart(id, option) { let dom=document.getElementById(id); if(!dom) return; let chart=echarts.init(dom); chart.setOption(option); window.addEventListener("resize",()=>chart.resize()); return chart; }
  if(D){
    const categoryChart = initChart("sunburst", {
      color:["#D4843A","#8CB36C","#C2635D","#A7B86C"],
      tooltip:{trigger:"item",formatter:"{b}<br/>命中次数：{c}"},
      series:[{
        type:"pie",
        radius:["46%","78%"],
        data:D.categoryDonut.map(item => ({
          ...item,
          itemStyle:{color:categoryColors[item.name] || "#7ED1C4"}
        })),
        label:chartText,
        emphasis:{scale:true,focus:"self"}
      }]
    });
    const catDetail = echarts.init(document.getElementById("topTerms"));
    window.addEventListener("resize",()=>catDetail.resize());
    function categoryDetailOption(data){
      const freshColors = ["#83c5be","#ffb4a2","#b8d8ba","#a9cce3","#f6d6ad","#c7b9ff","#9dd9d2","#f3a6b6","#bad7a7","#b8c7e6"];
      const allTerms = data.flatMap(group => (group.children || []).map(term => ({...term, group:group.name})));
      const maxTerm = Math.max(...allTerms.map(d=>d.value), 1);
      const nodes = [{name:"饮食词", x:0, y:0, symbolSize:10, fixed:true, itemStyle:{color:"rgba(31,37,34,.35)"}, label:{show:false}}];
      const links = [];
      data.forEach((group, groupIndex) => {
        const groupAngle = -90 + groupIndex * 360 / Math.max(data.length, 1);
        const groupRad = groupAngle * Math.PI / 180;
        const groupRadius = 34;
        const groupNode = {
          name:group.name,
          value:group.value,
          category:0,
          x:Math.cos(groupRad) * groupRadius,
          y:Math.sin(groupRad) * groupRadius,
          symbolSize:22,
          fixed:true,
          itemStyle:{color:freshColors[groupIndex % freshColors.length], opacity:.9},
          label:{show:true,position:"inside",color:"#1f2522",fontWeight:700,fontSize:12}
        };
        nodes.push(groupNode);
        links.push({source:"饮食词", target:group.name, value:group.value, lineStyle:{color:freshColors[groupIndex % freshColors.length], opacity:.42}});
        const terms = (group.children || []).slice(0,10);
        terms.forEach((term, termIndex) => {
          const spread = Math.min(46, 18 + terms.length * 2.6);
          const offset = terms.length === 1 ? 0 : -spread / 2 + spread * termIndex / (terms.length - 1);
          const angle = (groupAngle + offset) * Math.PI / 180;
          const radius = 62 + (termIndex % 4) * 8 + Math.floor(termIndex / 4) * 4;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          const termId = `${group.name}:${term.name}`;
          nodes.push({
            id:termId,
            name: term.name,
            group: group.name,
            value: term.value,
            category:1,
            x,
            y,
            symbolSize: 10 + Math.sqrt(term.value / maxTerm) * 42,
            fixed:true,
            itemStyle:{
              color:freshColors[groupIndex % freshColors.length],
              opacity:.58,
              borderColor:"rgba(255,252,244,.9)",
              borderWidth:1.5
            },
            label:{
              show:true,
              color:"#6d675e",
              fontSize:10,
              fontWeight:700,
              formatter:term.name,
              position:"inside"
            }
          });
          links.push({source:group.name, target:termId, value:term.value, lineStyle:{color:freshColors[groupIndex % freshColors.length], opacity:.34}});
        });
      });
      return {
        color:freshColors,
        tooltip:{
          trigger:"item",
          formatter: params => {
            if(params.dataType === "edge") return `${params.data.source} - ${params.data.target}<br/>${params.data.value || ""}`;
            if(params.data.group) return `${params.data.group} / ${params.name}<br/>词频：${params.value}`;
            if(params.name === "饮食词") return "";
            return `${params.name}<br/>命中次数：${params.value}`;
          }
        },
        series:[
          {
            type:"graph",
            layout:"none",
            coordinateSystem:null,
            data:nodes,
            links,
            roam:false,
            top:18,
            bottom:18,
            left:18,
            right:18,
            edgeSymbol:["none","none"],
            lineStyle:{width:1.2,curveness:.18},
            emphasis:{focus:"adjacency",lineStyle:{width:2.4,opacity:.75}},
            blur:{itemStyle:{opacity:.18},lineStyle:{opacity:.06},label:{opacity:.2}}
          }
        ]
      };
    }
    const renderDetail = (name)=>{
      let sel = name || D.categoryDonut[0]?.name;
      document.getElementById("categoryDetailTitle").innerHTML = `${sel}：二级大类与 Top10 饮食词`;
      catDetail.setOption(categoryDetailOption(D.categorySunbursts[sel] || []), true);
    };
    renderDetail();
    categoryChart?.on("click", params => { if(params.name) renderDetail(params.name); });
    // 词云：按词频缩放，并用螺旋排布减少重叠。
    const maxWord = Math.max(...D.wordCloud.map(d=>d.value));
    const cloudDiv=document.getElementById("wordCloud");
    function renderWordCloud(){
      if(!cloudDiv) return;
      cloudDiv.innerHTML = "";
      const rect = cloudDiv.getBoundingClientRect();
      const placed = [];
      const colors = ["#4f7f78","#a33a2d","#b89658","#263f4d","#7e8f62"];
      const centerX = rect.width / 2, centerY = rect.height / 2;
      const hit = (a,b) => !(a.x+a.w < b.x || b.x+b.w < a.x || a.y+a.h < b.y || b.y+b.h < a.y);
      D.wordCloud.slice(0, 72).forEach((d,i)=>{
        const sp=document.createElement("span");
        const size=14+Math.sqrt(d.value/maxWord)*50;
        const rotate=[0,0,0,-28,28,90][i%6];
        sp.style.fontSize=size+"px";
        sp.style.color=colors[i%colors.length];
        sp.style.opacity=0.58+0.34*(d.value/maxWord);
        sp.style.left=centerX+"px";
        sp.style.top=centerY+"px";
        sp.style.transform=`translate(-50%, -50%) rotate(${rotate}deg)`;
        sp.innerText=d.name;
        cloudDiv.appendChild(sp);
        const box = sp.getBoundingClientRect();
        let w = box.width + 8, h = box.height + 8, found = null;
        for(let t=0; t<460 && !found; t++){
          const angle = t * 0.48 + i * 0.72;
          const radius = 4 + t * 2.1;
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius * 0.68;
          const candidate = {x:x-w/2, y:y-h/2, w, h};
          const inside = candidate.x > 18 && candidate.y > 18 && candidate.x + w < rect.width - 18 && candidate.y + h < rect.height - 18;
          if(inside && !placed.some(p=>hit(candidate,p))) found = {x,y,box:candidate};
        }
        if(!found){
          const x = 40 + ((i * 67) % Math.max(80, rect.width - 80));
          const y = 40 + ((i * 43) % Math.max(80, rect.height - 80));
          found = {x,y,box:{x:x-w/2,y:y-h/2,w,h}};
        }
        placed.push(found.box);
        sp.style.left=found.x+"px";
        sp.style.top=found.y+"px";
      });
    }
    requestAnimationFrame(renderWordCloud);
    window.addEventListener("resize", renderWordCloud);
    initChart("wordFrequencyBar", {
      grid:{left:64,right:34,top:24,bottom:34},
      tooltip:{trigger:"axis",axisPointer:{type:"shadow"},formatter:params=>`${params[0].name}<br/>词频：${params[0].value}`},
      xAxis:{type:"value",splitLine:{lineStyle:{color:"rgba(79,127,120,.16)"}}},
      yAxis:{type:"category",inverse:true,data:D.wordCloud.slice(0,15).map(d=>d.name),axisTick:{show:false}},
      series:[{
        type:"bar",
        data:D.wordCloud.slice(0,15).map(d=>d.value),
        barMaxWidth:18,
        itemStyle:{color:"#7ED1C4",borderRadius:[0,8,8,0]},
        label:{show:true,position:"right",color:"#5b3426"}
      }]
    });
    initChart("wineRose", {
      color:["#4f7f78","#a33a2d","#b89658","#8fb8ad","#9f7868","#7c93a8","#c7835a","#6d8b52"],
      tooltip:{trigger:"item",formatter:"{b}<br/>词频：{c}"},
      legend:{bottom:0,type:"scroll",textStyle:chartText},
      series:[{
        type:"pie",
        radius:["44%","72%"],
        center:["50%","46%"],
        avoidLabelOverlap:true,
        data:D.wineKindTop,
        label:{...chartText,formatter:"{b}"},
        emphasis:{scale:true,scaleSize:8}
      }]
    });
    initChart("wineVessel", {
      grid:{left:70,right:42,top:28,bottom:34},
      tooltip:{trigger:"axis",axisPointer:{type:"shadow"}},
      xAxis:{type:"value",splitLine:{lineStyle:{color:"rgba(79,127,120,.18)"}}},
      yAxis:{type:"category",inverse:true,data:D.wineVesselTop.map(d=>d.name),axisTick:{show:false}},
      series:[
        {type:"bar",barWidth:4,data:D.wineVesselTop.map(d=>d.value),itemStyle:{color:"#6B4C6E",borderRadius:4},z:1},
        {type:"scatter",symbolSize:18,data:D.wineVesselTop.map((d,i)=>[d.value,i]),itemStyle:{color:"#D4843A",borderColor:"#fff",borderWidth:2},z:3}
      ]
    });
    function barChart(id,data,color){ initChart(id,{xAxis:{type:"value"},yAxis:{type:"category",inverse:true,data:data.map(d=>d.name)},series:[{type:"bar",data:data.map(d=>d.value),itemStyle:{color}}]}); }
    barChart("wineAuthors", D.wineAuthorTop, "#4f7f78"); barChart("wineRhythmics", D.wineRhythmicTop, "#b89658"); barChart("topAuthors", D.top5Authors, "#9f7868");
    function heatmapChart(id,matrix,colors){
      initChart(id,{
        grid:{left:76,right:28,top:28,bottom:82},
        tooltip:{position:"top"},
        xAxis:{type:"category",data:matrix.x,axisTick:{show:false}},
        yAxis:{type:"category",data:matrix.y,axisTick:{show:false}},
        visualMap:{
          min:0,
          max:Math.max(...matrix.data.map(v=>v[2])),
          orient:"horizontal",
          left:"center",
          bottom:6,
          text:["高","低"],
          calculable:true,
          inRange:{color:colors || ["#e9ecc2","#dca579","#b6485c"]}
        },
        series:[{type:"heatmap",data:matrix.data,emphasis:{itemStyle:{borderColor:"#fff",borderWidth:1}}}]
      });
    }
    heatmapChart("emotionFocus", D.wineEmotionMatrix, ["#E8B5B0","#C87570","#8B3631"]);
    heatmapChart("nonwineEmotionFocus", D.nonwineEmotionMatrix, ["#eef1bd","#e3b178","#bf3f4b"]);
    
    function graphFromMatrix(matrix, foodCategoryName){
      const weights = {};
      const links = matrix.data.map(([x,y,value])=>{
        const food = matrix.y[y], emotion = matrix.x[x];
        weights[food] = (weights[food] || 0) + value;
        weights[emotion] = (weights[emotion] || 0) + value;
        return {source:food,target:emotion,value};
      });
      const nodes = Object.entries(weights).map(([name,value])=>({
        name,
        value,
        category: matrix.x.includes(name) ? "情感类别" : foodCategoryName
      }));
      return {nodes, links};
    }
    const nonwineEmotionGraph = graphFromMatrix(D.nonwineEmotionMatrix, "非酒文化饮食词");
    function emotionGraphOption(graph, foodCategoryName){
      return {
      tooltip:{formatter: p => p.dataType === "edge" ? `${p.data.source} → ${p.data.target}<br/>共现 ${p.data.value}` : `${p.name}<br/>${p.data.category || ""}`},
      legend:{top:6,data:[foodCategoryName,"情感类别"],textStyle:chartText},
      series:[{
        type:"graph",
        layout:"force",
        categories:[{name:foodCategoryName,itemStyle:{color:"#4f7f78"}},{name:"情感类别",itemStyle:{color:"#a33a2d"}}],
        data:graph.nodes.map(n=>({
          ...n,
          symbolSize:Math.max(34, Math.min(78, 22 + Math.sqrt(n.value) * 1.2)),
          itemStyle:{color:n.category==="情感类别" ? "#a33a2d" : "#4f7f78"}
        })),
        links:graph.links,
        emphasis:{
          focus:"adjacency",
          lineStyle:{width:3,opacity:.9}
        },
        blur:{itemStyle:{opacity:.16},lineStyle:{opacity:.06},label:{opacity:.16}},
        label:{
          show:true,
          position:"inside",
          color:"#fff",
          fontSize:10,
          fontWeight:700,
          formatter:p=>p.name
        },
        lineStyle:{color:"rgba(79,127,120,.34)",width:1,curveness:.12},
        force: {
          repulsion: 600,
          gravity: 0.2,
          edgeLength: 180,
          layoutAnimation: true
        },
        nodeScaleRatio: 0.4,
        roam: true
      }]
      };
    }
    initChart("wineEmotionGraph", emotionGraphOption(D.wineEmotionGraph, "酒文化饮食词"));
    initChart("nonwineEmotionGraph", emotionGraphOption(nonwineEmotionGraph, "非酒文化饮食词"));

    initChart("seasonHeatmap", {
      grid:{left:76,right:28,top:30,bottom:86},
      tooltip:{position:"top"},
      xAxis:{type:"category",data:D.seasonHeatmap.x,axisTick:{show:false}},
      yAxis:{type:"category",data:D.seasonHeatmap.y,axisTick:{show:false}},
      visualMap:{
        min:0,
        max:Math.max(...D.seasonHeatmap.data.map(v=>v[2])),
        orient:"horizontal",
        left:"center",
        bottom:6,
        text:["高频","低频"],
        calculable:true,
        inRange:{color:["#edf4e0","#c8ddb8","#93bb94","#4f7f78"]}
      },
      series:[{type:"heatmap",data:D.seasonHeatmap.data,emphasis:{itemStyle:{borderColor:"#fff",borderWidth:1}}}]
    });
    const seasonDiv=document.getElementById("seasonCards"); if(seasonDiv)["春","夏","秋","冬"].forEach(s=>{ let c=document.createElement("div");c.className="card season-card";c.innerHTML=`<strong>${s}</strong><div class="chips">${(D.seasonCards[s]||[]).map(t=>`<span class="chip">${t.name} ${t.value}</span>`).join("")}</div>`; seasonDiv.appendChild(c);});
    const emotionNames = new Set([...(D.wineEmotionMatrix.x || []), ...(D.nonwineEmotionMatrix.x || [])]);
    const seasonsSet = new Set(["春","夏","秋","冬","季:春","季:夏","季:秋","季:冬"]);
    const seasonColors = {"春":"#8fbf7f","夏":"#4f9d93","秋":"#b89658","冬":"#7c93a8"};
    function sankeyNodeColor(name, kind){
      const clean = name.replace(/^食:|^情:|^季:/, "");
      if(seasonsSet.has(name) || seasonsSet.has(clean)) return seasonColors[clean] || "#7c93a8";
      if(name.startsWith("情:") || emotionNames.has(name) || emotionNames.has(clean)) return "#a33a2d";
      if(kind === "author" && D.top5Authors.some(d=>d.name === name)) return "#9f7868";
      return "#4f7f78";
    }
    function colorSankeyNodes(nodes, kind){
      return nodes.map(n=>({...n,itemStyle:{color:sankeyNodeColor(n.name, kind),borderColor:"rgba(255,252,244,.8)",borderWidth:1}}));
    }
    const sankeyFocus = {
      type:"sankey",
      emphasis:{focus:"adjacency"},
      blur:{itemStyle:{opacity:.16},lineStyle:{opacity:.08},label:{opacity:.18}},
      lineStyle:{color:"source",curveness:.5,opacity:.28}
    };
    initChart("sankey",{series:[{...sankeyFocus,data:colorSankeyNodes(D.sankey.nodes,"author"),links:D.sankey.links}]});
    initChart("triSankey",{series:[{...sankeyFocus,data:colorSankeyNodes(D.triSankey.nodes,"triad"),links:D.triSankey.links}]});
    initChart("authorSeasonSankey",{series:[{...sankeyFocus,data:colorSankeyNodes(D.authorSeasonSankey.nodes,"authorSeason"),links:D.authorSeasonSankey.links,label:{formatter:p=>p.name.replace(/^季:/,"")}}]});
    const searchBtn=document.getElementById("searchBtn"); const queryInp=document.getElementById("query");
    const renderResults=(q)=>{ let pool=q? D.poems.filter(p=>p.author.includes(q)||p.rhythmic.includes(q)||p.terms.some(t=>t.includes(q))||p.text.includes(q)): D.poems.slice(0,6); document.getElementById("results").innerHTML=pool.slice(0,6).map(p=>`<article class="result-card"><h4>${p.author}《${p.rhythmic}》</h4><div class="chips">${p.terms.slice(0,6).map(t=>`<span class="chip">${t}</span>`).join("")}</div><p>${p.text.substring(0,140)}…</p></article>`).join(""); };
    searchBtn?.addEventListener("click",()=>renderResults(queryInp.value)); renderResults("");
  }

  // ========= 第二段：中国地图 + 点击省份侧边栏（只在地图内显示，点击后出现） =========
  const regionSource = window.SONGCI_REGION_DATA || {};
  const chinaProvinceNames = ['北京','天津','河北','山西','内蒙古','辽宁','吉林','黑龙江','上海','江苏','浙江','安徽','福建','江西','山东','河南','湖北','湖南','广东','广西','海南','重庆','四川','贵州','云南','西藏','陕西','甘肃','青海','宁夏','新疆','香港','澳门','台湾'];
  const provinceData = chinaProvinceNames.map(name => ({
    name,
    value: regionSource[name]?.value || 0,
    sentence: regionSource[name]?.sentence || ""
  }));

  const mapChart = echarts.init(document.getElementById('china-map'));
  const wordChartMini = echarts.init(document.getElementById('word-chart'));
  let selectedProvince = "";
  mapChart.setOption({
    title: { text: '各省份饮食相关宋词数量热力分布', left: 'center', textStyle: { fontSize: 20, color: '#2c2416', fontFamily: "楷体" } },
    tooltip: { trigger: 'item', formatter: params => { let it=provinceData.find(d=>d.name===params.name); return it?`${params.name}<br/>数量:${it.value}首<br/>${it.sentence||''}`:`${params.name}`; } },
    visualMap: { type: 'piecewise', pieces: [{min:0,max:1,color:'#f9f3ee'},{min:2,max:10,color:'#e9d4c2'},{min:11,max:30,color:'#dfc2ab'},{min:31,max:100,color:'#c1a390'},{min:101,max:200,color:'#9f7868'},{min:201,color:'#5b3426'}] },
    series: [{ type: 'map', mapType: 'china', selectedMode: 'single', data: provinceData, label: { show: true, fontSize: 10 }, itemStyle: { borderColor: '#b8a98f' }, select:{itemStyle:{areaColor:'#8e6454',borderColor:'#5b3426',borderWidth:1.5}} }]
  });

  const panel = document.getElementById('info-panel');
  const closePanelBtn = document.getElementById('closePanelBtn');
  const provinceImageBase = "assets/images/provinces/";
  const fallbackProvinceImage = `${provinceImageBase}江苏.png`;
  const fallbackBackgroundImage = "assets/images/bg.jpg";
  function resolveProvinceImage(src){
    const value = String(src || "").trim();
    if(!value) return fallbackProvinceImage;
    if(/^(https?:|data:|\/|assets\/)/.test(value)) return value;
    return provinceImageBase + value;
  }
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function showProvinceInfo(name){
    let data = provinceData.find(i=>i.name===name) || {value:0,name:name};
    let extra = regionSource[name] || {img:'江苏.png', words:[], poems:[]};
    let empty = data.value===0;
    const provinceImg = document.getElementById('province-img');
    provinceImg.onerror = () => {
      provinceImg.onerror = null;
      provinceImg.src = fallbackBackgroundImage;
    };
    provinceImg.src = resolveProvinceImage(extra.img);
    document.getElementById('panel-title').innerText = data.name;
    document.getElementById('total-count').innerText = data.value;
    if(empty || !extra.words?.length){
      document.getElementById('word-chart').classList.add('hide');
      document.getElementById('wordChartTitle').classList.add('hide');
    } else {
      document.getElementById('word-chart').classList.remove('hide');
      document.getElementById('wordChartTitle').classList.remove('hide');
      const words = [...extra.words];
      wordChartMini.setOption({
        tooltip:{trigger:'axis',axisPointer:{type:'shadow'}},
        grid:{top:18,bottom:46,left:28,right:18,width:'72%'},
        xAxis:{type:'category',data:words.map(d=>d.name),axisTick:{show:false},axisLabel:{interval:0,rotate:0,fontSize:11,overflow:'break',width:36}},
        yAxis:{type:'value',splitLine:{lineStyle:{color:'rgba(176,142,124,.18)'}}},
        series:[{data:words.map(d=>d.value),type:'bar',barMaxWidth:24,itemStyle:{color:'#9f7868',borderRadius:[6,6,0,0]},label:{show:true,position:'top',color:'#5b3426'}}]
      });
    }
    if(empty || !extra.poems?.length){
      document.getElementById('poemTitle').classList.add('hide');
      document.getElementById('poem-list').innerHTML = '<div class="empty-tip">暂无详细饮食词作</div>';
    } else {
      document.getElementById('poemTitle').classList.remove('hide');
      let poemsHtml = '';
      const p = extra.poems[0];
      poemsHtml+=`<div class="poem-wrap">
          <div class="poem-name">${escapeHtml(p.rhythmic)}${p.id ? ` <span style="font-size:12px;color:#8e6454;">#${p.id}</span>` : ""}</div>
          <div class="poem-author">${escapeHtml(p.author)}</div>
          ${p.regionTerms ? `<div class="chips" style="justify-content:center;margin-top:6px;"><span class="chip">${escapeHtml(p.regionTerms)}</span></div>` : ""}
          <div class="poem-content">${escapeHtml(p.text)}</div>
        </div>`;
      document.getElementById('poem-list').innerHTML = poemsHtml;
    }
    panel.classList.add('show');
    selectedProvince = name;
    mapChart.dispatchAction({type:'mapUnSelect', seriesIndex:0});
    mapChart.dispatchAction({type:'mapSelect', seriesIndex:0, name});
  }
  function closePanel(){
    panel.classList.remove('show');
    if(selectedProvince) mapChart.dispatchAction({type:'mapUnSelect', seriesIndex:0, name:selectedProvince});
    selectedProvince = "";
  }
  mapChart.on('click', params => {
    if(params.name) showProvinceInfo(params.name);
    else closePanel();
  });
  mapChart.getZr().on('click', event => {
    if(!event.target) closePanel();
  });
  closePanelBtn.addEventListener('click', closePanel);
  document.addEventListener('click', event => {
    if(!panel.classList.contains('show')) return;
    if(event.target.closest('#info-panel') || event.target.closest('#china-map')) return;
    closePanel();
  });

  // 导航高亮
  const links = Array.from(document.querySelectorAll("nav a"));
  const sections = links
    .map(link => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);
  function syncActiveNav(){
    const anchor = window.scrollY + window.innerHeight * 0.36;
    let current = sections[0];
    for(const section of sections){
      if(section.offsetTop <= anchor) current = section;
      else break;
    }
    let activeLink = null;
    links.forEach(link => {
      const isActive = link.getAttribute("href") === `#${current.id}`;
      link.classList.toggle("active", isActive);
      if(isActive) activeLink = link;
    });
    const nav = activeLink?.parentElement;
    if(nav && nav.scrollWidth > nav.clientWidth){
      nav.scrollTo({left: activeLink.offsetLeft - nav.clientWidth / 2 + activeLink.clientWidth / 2, behavior:"smooth"});
    }
  }
  window.addEventListener("scroll", syncActiveNav, {passive:true});
  window.addEventListener("resize", syncActiveNav);
  syncActiveNav();
