const ZADANIA = [{"g":1,"t":"karta","c":12,"o":"Złów rybę na 12 punktów lub więcej","m":0.3,"i":0},{"g":1,"t":"tier2","c":1,"o":"Złów rybę pasma 2 lub wyżej","m":0.3,"i":1},{"g":1,"t":"karta","c":18,"o":"Złów rybę na 18 punktów lub więcej","m":0.4,"i":2},{"g":1,"t":"tier3","c":1,"o":"Złów rybę pasma 3 lub wyżej","m":0.5,"i":3},{"g":1,"t":"karta","c":24,"o":"Złów rybę na 24 punktów lub więcej","m":0.6,"i":4},{"g":1,"t":"punkty","c":60,"o":"Uzbieraj 60 punktów","m":0.7,"i":5},{"g":1,"t":"tier2","c":2,"o":"Złów 2 ryby pasma 2 lub wyżej","m":0.7,"i":6},{"g":1,"t":"zlow","c":3,"o":"Złów 3 ryby","m":0.8,"i":7},{"g":1,"t":"karta","c":30,"o":"Złów rybę na 30 punktów lub więcej","m":0.8,"i":8},{"g":1,"t":"tier4","c":1,"o":"Złów rybę pasma 4 lub wyżej","m":0.8,"i":9},{"g":1,"t":"seria","c":2,"o":"Zbuduj serię 2 ryb tego samego gatunku","m":0.9,"i":10},{"g":1,"t":"tier2","c":3,"o":"Złów 3 ryby pasma 2 lub wyżej","m":1.0,"i":11},{"g":1,"t":"tier3","c":2,"o":"Złów 2 ryby pasma 3 lub wyżej","m":1.0,"i":12},{"g":1,"t":"punkty","c":100,"o":"Uzbieraj 100 punktów","m":1.1,"i":13},{"g":1,"t":"karta","c":36,"o":"Złów rybę na 36 punktów lub więcej","m":1.2,"i":14},{"g":1,"t":"zlow","c":5,"o":"Złów 5 ryb","m":1.3,"i":15},{"g":1,"t":"tier3","c":3,"o":"Złów 3 ryby pasma 3 lub wyżej","m":1.5,"i":16},{"g":1,"t":"tier5","c":1,"o":"Złów rybę pasma 5 lub wyżej","m":1.5,"i":17},{"g":1,"t":"punkty","c":150,"o":"Uzbieraj 150 punktów","m":1.6,"i":18},{"g":1,"t":"tier2","c":5,"o":"Złów 5 ryb pasma 2 lub wyżej","m":1.6,"i":19},{"g":1,"t":"tier4","c":2,"o":"Złów 2 ryby pasma 4 lub wyżej","m":1.6,"i":20},{"g":1,"t":"gat","c":1,"o":"Złów 1 sztukę: PŁOĆ","m":1.7,"k":"ploc","i":21},{"g":1,"t":"karta","c":42,"o":"Złów rybę na 42 punktów lub więcej","m":1.9,"i":22},{"g":1,"t":"zlow","c":8,"o":"Złów 8 ryb","m":2.1,"i":23},{"g":1,"t":"gatunki","c":3,"o":"Złów 3 różne gatunki","m":2.2,"i":24},{"g":1,"t":"punkty","c":220,"o":"Uzbieraj 220 punktów","m":2.4,"i":25},{"g":1,"t":"tier3","c":5,"o":"Złów 5 ryb pasma 3 lub wyżej","m":2.4,"i":26},{"g":1,"t":"tier4","c":3,"o":"Złów 3 ryby pasma 4 lub wyżej","m":2.4,"i":27},{"g":1,"t":"wiadro","c":3,"o":"Miej 3 ryby naraz w wiaderku","m":2.5,"i":28},{"g":1,"t":"zlow","c":10,"o":"Złów 10 ryb","m":2.6,"i":29},{"g":1,"t":"tier2","c":8,"o":"Złów 8 ryb pasma 2 lub wyżej","m":2.6,"i":30},{"g":1,"t":"lawice","c":3,"o":"Wymień ławicę 3 razy","m":0.1,"i":31},{"g":1,"t":"zlow","c":12,"o":"Złów 12 ryb","m":3.1,"i":32},{"g":1,"t":"tier5","c":2,"o":"Złów 2 ryby pasma 5 lub wyżej","m":3.1,"i":33},{"g":1,"t":"gat","c":1,"o":"Złów 1 sztukę: OKOŃ","m":3.2,"k":"okon","i":34},{"g":1,"t":"punkty","c":300,"o":"Uzbieraj 300 punktów","m":3.3,"i":35},{"g":1,"t":"zlow","c":15,"o":"Złów 15 ryb","m":3.8,"i":36},{"g":1,"t":"karta","c":46,"o":"Złów rybę na 46 punktów lub więcej","m":3.8,"i":37},{"g":1,"t":"tier2","c":12,"o":"Złów 12 ryb pasma 2 lub wyżej","m":3.9,"i":38},{"g":1,"t":"tier3","c":8,"o":"Złów 8 ryb pasma 3 lub wyżej","m":3.9,"i":39},{"g":1,"t":"sprzedaz","c":200,"o":"Sprzedaj wiaderko za 200 qryb w jednej transakcji","m":5.0,"i":40},{"g":1,"t":"karta","c":49,"o":"Złów rybę na 49 punktów lub więcej","m":4.1,"i":41},{"g":1,"t":"tier4","c":5,"o":"Złów 5 ryb pasma 4 lub wyżej","m":4.1,"i":42},{"g":1,"t":"karta","c":51,"o":"Złów rybę na 51 punktów lub więcej","m":4.2,"i":43},{"g":1,"t":"tier6","c":1,"o":"Złów rybę pasma 6 lub wyżej","m":4.2,"i":44},{"g":1,"t":"punkty","c":420,"o":"Uzbieraj 420 punktów","m":4.6,"i":45},{"g":1,"t":"tier5","c":3,"o":"Złów 3 ryby pasma 5 lub wyżej","m":4.6,"i":46},{"g":1,"t":"gatunki","c":5,"o":"Złów 5 różnych gatunków","m":4.6,"i":47},{"g":1,"t":"lawice","c":5,"o":"Wymień ławicę 5 razy","m":0.2,"i":48},{"g":1,"t":"zlow","c":20,"o":"Złów 20 ryb","m":5.1,"i":49},{"g":1,"t":"gat","c":1,"o":"Złów 1 sztukę: UKLEJA","m":5.1,"k":"ukleja","i":50},{"g":1,"t":"gat","c":3,"o":"Złów 3 sztuki: PŁOĆ","m":5.2,"k":"ploc","i":51},{"g":1,"t":"gat","c":1,"o":"Złów 1 sztukę: LESZCZ","m":5.2,"k":"leszcz","i":52},{"g":1,"t":"gat","c":1,"o":"Złów 1 sztukę: JAZGARZ","m":5.6,"k":"jazgarz","i":53},{"g":1,"t":"tier3","c":12,"o":"Złów 12 ryb pasma 3 lub wyżej","m":5.8,"i":54},{"g":1,"t":"tier2","c":18,"o":"Złów 18 ryb pasma 2 lub wyżej","m":5.9,"i":55},{"g":1,"t":"seria","c":3,"o":"Zbuduj serię 3 ryb tego samego gatunku","m":5.9,"i":56},{"g":1,"t":"gat","c":1,"o":"Złów 1 sztukę: KARAŚ SREBRZYSTY","m":6.2,"k":"karas_srebrzysty","i":57},{"g":1,"t":"zlow","c":25,"o":"Złów 25 ryb","m":6.4,"i":58},{"g":1,"t":"punkty","c":600,"o":"Uzbieraj 600 punktów","m":6.5,"i":59},{"g":1,"t":"tier4","c":8,"o":"Złów 8 ryb pasma 4 lub wyżej","m":6.5,"i":60},{"g":1,"t":"wiadro","c":6,"o":"Miej 6 ryb naraz w wiaderku","m":7.0,"i":61},{"g":1,"t":"gat","c":1,"o":"Złów 1 sztukę: KRĄP","m":7.2,"k":"krap","i":62},{"g":1,"t":"gat","c":1,"o":"Złów 1 sztukę: KIEŁB","m":7.3,"k":"kielb","i":63},{"g":1,"t":"tier5","c":5,"o":"Złów 5 ryb pasma 5 lub wyżej","m":7.6,"i":64},{"g":1,"t":"zlow","c":30,"o":"Złów 30 ryb","m":7.7,"i":65},{"g":1,"t":"dokladnie","c":41,"o":"Złów rybę dokładnie na 41 punktów","m":7.9,"i":66},{"g":1,"t":"srednia","c":22,"o":"Miej średnią powyżej 22 punktów na rybę","m":8,"i":67},{"g":1,"t":"tier6","c":2,"o":"Złów 2 ryby pasma 6 lub wyżej","m":8.3,"i":68},{"g":1,"t":"tier3","c":18,"o":"Złów 18 ryb pasma 3 lub wyżej","m":8.7,"i":69},{"g":1,"t":"gat","c":5,"o":"Złów 5 sztuk: PŁOĆ","m":8.7,"k":"ploc","i":70},{"g":1,"t":"utarg","c":500,"o":"Utarguj 500 qryb w ciągu doby","m":5.0,"i":71},{"g":1,"t":"gatunki","c":8,"o":"Złów 8 różnych gatunków","m":9.1,"i":72},{"g":1,"t":"punkty","c":850,"o":"Uzbieraj 850 punktów","m":9.3,"i":73},{"g":1,"t":"gat","c":3,"o":"Złów 3 sztuki: OKOŃ","m":9.5,"k":"okon","i":74},{"g":1,"t":"tier4","c":12,"o":"Złów 12 ryb pasma 4 lub wyżej","m":9.7,"i":75},{"g":1,"t":"lawice","c":10,"o":"Wymień ławicę 10 razy","m":0.3,"i":76},{"g":1,"t":"dokladnie","c":21,"o":"Złów rybę dokładnie na 21 punktów","m":10.2,"i":77},{"g":1,"t":"zlow","c":40,"o":"Złów 40 ryb","m":10.3,"i":78},{"g":1,"t":"dokladnie","c":14,"o":"Złów rybę dokładnie na 14 punktów","m":10.7,"i":79},{"g":1,"t":"gat","c":1,"o":"Złów 1 sztukę: CIERNIK","m":10.8,"k":"ciernik","i":80},{"g":1,"t":"sprzedaz","c":600,"o":"Sprzedaj wiaderko za 600 qryb w jednej transakcji","m":5.0,"i":81},{"g":1,"t":"karta","c":53,"o":"Złów rybę na 53 punktów lub więcej","m":11.1,"i":82},{"g":1,"t":"rekord","c":1,"o":"Pobij rekord życiowy","m":12,"i":83},{"g":2,"t":"tier5","c":8,"o":"Złów 8 ryb pasma 5 lub wyżej","m":12.2,"i":84},{"g":2,"t":"gat","c":1,"o":"Złów 1 sztukę: LIN","m":12.2,"k":"lin","i":85},{"g":2,"t":"tier6","c":3,"o":"Złów 3 ryby pasma 6 lub wyżej","m":12.5,"i":86},{"g":2,"t":"zlow","c":50,"o":"Złów 50 ryb","m":12.8,"i":87},{"g":2,"t":"punkty","c":1200,"o":"Uzbieraj 1200 punktów","m":13.1,"i":88},{"g":2,"t":"gat","c":1,"o":"Złów 1 sztukę: KARP","m":13.1,"k":"karp","i":89},{"g":2,"t":"dokladnie","c":33,"o":"Złów rybę dokładnie na 33 punktów","m":13.2,"i":90},{"g":2,"t":"rekordPL","c":1,"o":"Pobij rekord Polski","m":13.3,"i":91},{"g":2,"t":"gat","c":1,"o":"Złów 1 sztukę: SZCZUPAK","m":13.3,"k":"szczupak","i":92},{"g":2,"t":"gat","c":1,"o":"Złów 1 sztukę: KARAŚ POSPOLITY","m":13.7,"k":"karas","i":93},{"g":2,"t":"gat","c":1,"o":"Złów 1 sztukę: SIELAWA","m":13.8,"k":"sielawa","i":94},{"g":2,"t":"nowy","c":1,"o":"Odkryj nowy gatunek","m":14,"i":95},{"g":2,"t":"dokladnie","c":27,"o":"Złów rybę dokładnie na 27 punktów","m":14.6,"i":96},{"g":2,"t":"tier4","c":18,"o":"Złów 18 ryb pasma 4 lub wyżej","m":14.6,"i":97},{"g":1,"t":"lawice","c":15,"o":"Wymień ławicę 15 razy","m":0.5,"i":98},{"g":2,"t":"gat","c":3,"o":"Złów 3 sztuki: UKLEJA","m":15.2,"k":"ukleja","i":99},{"g":2,"t":"zlow","c":60,"o":"Złów 60 ryb","m":15.4,"i":100},{"g":2,"t":"dokladnie","c":52,"o":"Złów rybę dokładnie na 52 punktów","m":15.4,"i":101},{"g":2,"t":"gat","c":3,"o":"Złów 3 sztuki: LESZCZ","m":15.6,"k":"leszcz","i":102},{"g":2,"t":"gat","c":5,"o":"Złów 5 sztuk: OKOŃ","m":15.8,"k":"okon","i":103},{"g":2,"t":"gat","c":1,"o":"Złów 1 sztukę: JAŹ","m":16.0,"k":"jaz","i":104},{"g":1,"t":"wiadro","c":10,"o":"Miej 10 ryb naraz w wiaderku","m":2.6,"i":105},{"g":2,"t":"srednia","c":26,"o":"Miej średnią powyżej 26 punktów na rybę","m":16.5,"i":106},{"g":2,"t":"gat","c":3,"o":"Złów 3 sztuki: JAZGARZ","m":16.8,"k":"jazgarz","i":107},{"g":2,"t":"gat","c":10,"o":"Złów 10 sztuk: PŁOĆ","m":17.5,"k":"ploc","i":108},{"g":2,"t":"tier5","c":12,"o":"Złów 12 ryb pasma 5 lub wyżej","m":18.3,"i":109},{"g":2,"t":"gat","c":1,"o":"Złów 1 sztukę: KLEŃ","m":18.4,"k":"klen","i":110},{"g":2,"t":"gat","c":1,"o":"Złów 1 sztukę: GŁOWACICA","m":18.4,"k":"glowacica","i":111},{"g":2,"t":"punkty","c":1700,"o":"Uzbieraj 1700 punktów","m":18.5,"i":112},{"g":2,"t":"gat","c":3,"o":"Złów 3 sztuki: KARAŚ SREBRZYSTY","m":18.7,"k":"karas_srebrzysty","i":113},{"g":2,"t":"gat","c":1,"o":"Złów 1 sztukę: SŁONECZNICA","m":18.7,"k":"slonecznica","i":114},{"g":2,"t":"gatunki","c":12,"o":"Złów 12 różnych gatunków","m":18.9,"i":115},{"g":1,"t":"lawice","c":20,"o":"Wymień ławicę 20 razy","m":0.7,"i":116},{"g":2,"t":"zlow","c":80,"o":"Złów 80 ryb","m":20.5,"i":117},{"g":2,"t":"tier6","c":5,"o":"Złów 5 ryb pasma 6 lub wyżej","m":20.8,"i":118},{"g":2,"t":"gat","c":3,"o":"Złów 3 sztuki: KRĄP","m":21.5,"k":"krap","i":119},{"g":2,"t":"gat","c":3,"o":"Złów 3 sztuki: KIEŁB","m":21.9,"k":"kielb","i":120},{"g":1,"t":"utarg","c":1500,"o":"Utarguj 1500 qryb w ciągu doby","m":5.0,"i":121},{"g":2,"t":"dokladnie","c":38,"o":"Złów rybę dokładnie na 38 punktów","m":23.1,"i":122},{"g":2,"t":"rekord","c":2,"o":"Pobij rekord życiowy 2 razy","m":24,"i":123},{"g":2,"t":"gat","c":1,"o":"Złów 1 sztukę: MINÓG UKRAIŃSKI","m":24.0,"k":"minog_ukrainski","i":124},{"g":2,"t":"gat","c":5,"o":"Złów 5 sztuk: UKLEJA","m":25.3,"k":"ukleja","i":125},{"g":2,"t":"zlow","c":100,"o":"Złów 100 ryb","m":25.6,"i":126},{"g":2,"t":"dokladnie","c":44,"o":"Złów rybę dokładnie na 44 punktów","m":25.8,"i":127},{"g":2,"t":"srednia","c":30,"o":"Miej średnią powyżej 30 punktów na rybę","m":26.0,"i":128},{"g":2,"t":"gat","c":5,"o":"Złów 5 sztuk: LESZCZ","m":26.0,"k":"leszcz","i":129},{"g":1,"t":"sprzedaz","c":1500,"o":"Sprzedaj wiaderko za 1500 qryb w jednej transakcji","m":5.0,"i":130},{"g":2,"t":"punkty","c":2400,"o":"Uzbieraj 2400 punktów","m":26.1,"i":131},{"g":2,"t":"gat","c":2,"o":"Złów 2 sztuki: KARP","m":26.2,"k":"karp","i":132},{"g":2,"t":"rekordPL","c":2,"o":"Pobij rekord Polski 2 razy","m":26.5,"i":133},{"g":2,"t":"gat","c":2,"o":"Złów 2 sztuki: SZCZUPAK","m":26.6,"k":"szczupak","i":134},{"g":2,"t":"gat","c":1,"o":"Złów 1 sztukę: SANDACZ","m":27.0,"k":"sandacz","i":135},{"g":2,"t":"gat","c":1,"o":"Złów 1 sztukę: PSTRĄG POTOKOWY","m":27.1,"k":"pstrag","i":136},{"g":2,"t":"gat","c":2,"o":"Złów 2 sztuki: KARAŚ POSPOLITY","m":27.4,"k":"karas","i":137},{"g":2,"t":"tier5","c":18,"o":"Złów 18 ryb pasma 5 lub wyżej","m":27.5,"i":138},{"g":2,"t":"gat","c":2,"o":"Złów 2 sztuki: SIELAWA","m":27.6,"k":"sielawa","i":139},{"g":2,"t":"nowy","c":2,"o":"Odkryj 2 nowe gatunki","m":28,"i":140},{"g":2,"t":"gat","c":5,"o":"Złów 5 sztuk: JAZGARZ","m":28.0,"k":"jazgarz","i":141},{"g":2,"t":"gat","c":1,"o":"Złów 1 sztukę: MINÓG RZECZNY","m":28.6,"k":"minog_rzeczny","i":142},{"g":2,"t":"olbrzym","c":1,"o":"Złów olbrzyma ponad sufitem gatunku","m":29.0,"i":143},{"g":2,"t":"gat","c":1,"o":"Złów 1 sztukę: BARAKUDA","m":29.3,"k":"barakuda","i":144},{"g":2,"t":"gat","c":1,"o":"Złów 1 sztukę: KOZA","m":29.3,"k":"koza","i":145},{"g":1,"t":"lawice","c":30,"o":"Wymień ławicę 30 razy","m":1.0,"i":146},{"g":2,"t":"gat","c":1,"o":"Złów 1 sztukę: AMUR BIAŁY","m":30.0,"k":"amur","i":147},{"g":2,"t":"gat","c":1,"o":"Złów 1 sztukę: RÓŻANKA","m":30.0,"k":"rozanka","i":148},{"g":2,"t":"gat","c":1,"o":"Złów 1 sztukę: BRZANA","m":30.3,"k":"brzana","i":149},{"g":2,"t":"gat","c":1,"o":"Złów 1 sztukę: ŚLIZ","m":31.1,"k":"sliz","i":150},{"g":2,"t":"gat","c":5,"o":"Złów 5 sztuk: KARAŚ SREBRZYSTY","m":31.2,"k":"karas_srebrzysty","i":151},{"g":2,"t":"gat","c":1,"o":"Złów 1 sztukę: BŁAZENEK","m":31.3,"k":"blazenek","i":152},{"g":2,"t":"gatunki","c":16,"o":"Złów 16 różnych gatunków","m":31.4,"i":153},{"g":2,"t":"gat","c":10,"o":"Złów 10 sztuk: OKOŃ","m":31.7,"k":"okon","i":154},{"g":2,"t":"gat","c":2,"o":"Złów 2 sztuki: JAŹ","m":32.1,"k":"jaz","i":155},{"g":2,"t":"gat","c":3,"o":"Złów 3 sztuki: CIERNIK","m":32.4,"k":"ciernik","i":156},{"g":2,"t":"gat","c":1,"o":"Złów 1 sztukę: JELEC","m":32.9,"k":"jelec","i":157},{"g":2,"t":"tier6","c":8,"o":"Złów 8 ryb pasma 6 lub wyżej","m":33.2,"i":158},{"g":2,"t":"gat","c":1,"o":"Złów 1 sztukę: MINÓG MAJLOWY","m":33.7,"k":"minog_majlowy","i":159},{"g":2,"t":"dokladnie","c":54,"o":"Złów rybę dokładnie na 54 punktów","m":34.2,"i":160},{"g":2,"t":"gat","c":1,"o":"Złów 1 sztukę: JESIOTR OSTRONOSY","m":34.2,"k":"jesiotr","i":161},{"g":2,"t":"gat","c":1,"o":"Złów 1 sztukę: PSTRĄG TĘCZOWY","m":34.2,"k":"pstrag_teczowy","i":162},{"g":2,"t":"gat","c":1,"o":"Złów 1 sztukę: SUM","m":34.7,"k":"sum","i":163},{"g":2,"t":"gat","c":20,"o":"Złów 20 sztuk: PŁOĆ","m":34.9,"k":"ploc","i":164},{"g":2,"t":"gat","c":1,"o":"Złów 1 sztukę: TROĆ","m":35.1,"k":"troc","i":165},{"g":2,"t":"gat","c":1,"o":"Złów 1 sztukę: STYNKA","m":35.4,"k":"stynka","i":166},{"g":2,"t":"gat","c":1,"o":"Złów 1 sztukę: ŚWINKA","m":35.4,"k":"swinka","i":167},{"g":2,"t":"gat","c":5,"o":"Złów 5 sztuk: KRĄP","m":35.8,"k":"krap","i":168},{"g":2,"t":"zlow","c":140,"o":"Złów 140 ryb","m":35.9,"i":169},{"g":2,"t":"rekord","c":3,"o":"Pobij rekord życiowy 3 razy","m":36,"i":170},{"g":2,"t":"gat","c":1,"o":"Złów 1 sztukę: KONIK MORSKI","m":36.4,"k":"konik_krysztalowy","i":171},{"g":2,"t":"gat","c":1,"o":"Złów 1 sztukę: MIĘTUS","m":36.4,"k":"mietus","i":172},{"g":2,"t":"gat","c":5,"o":"Złów 5 sztuk: KIEŁB","m":36.5,"k":"kielb","i":173},{"g":2,"t":"gat","c":1,"o":"Złów 1 sztukę: MASKINONG","m":36.6,"k":"muskellunge","i":174},{"g":2,"t":"gat","c":1,"o":"Złów 1 sztukę: PISKORZ","m":36.6,"k":"piskorz","i":175},{"g":2,"t":"gat","c":3,"o":"Złów 3 sztuki: LIN","m":36.7,"k":"lin","i":176},{"g":2,"t":"gat","c":2,"o":"Złów 2 sztuki: KLEŃ","m":36.9,"k":"klen","i":177},{"g":2,"t":"gat","c":2,"o":"Złów 2 sztuki: GŁOWACICA","m":36.9,"k":"glowacica","i":178},{"g":2,"t":"gat","c":1,"o":"Złów 1 sztukę: BABKA","m":36.9,"k":"babki","i":179},{"g":2,"t":"punkty","c":3400,"o":"Uzbieraj 3400 punktów","m":37.0,"i":180},{"g":2,"t":"gat","c":2,"o":"Złów 2 sztuki: SŁONECZNICA","m":37.4,"k":"slonecznica","i":181},{"g":2,"t":"gat","c":1,"o":"Złów 1 sztukę: TRAWIANKA","m":38.0,"k":"trawianka","i":182},{"g":2,"t":"gat","c":1,"o":"Złów 1 sztukę: WĘGORZ","m":38.3,"k":"wegorz","i":183},{"g":2,"t":"gat","c":1,"o":"Złów 1 sztukę: CERTA","m":38.3,"k":"certa","i":184},{"g":2,"t":"srednia","c":34,"o":"Miej średnią powyżej 34 punktów na rybę","m":38.9,"i":185},{"g":2,"t":"rekordPL","c":3,"o":"Pobij rekord Polski 3 razy","m":39.8,"i":186},{"g":2,"t":"gat","c":1,"o":"Złów 1 sztukę: SUMIK KARŁOWATY","m":39.8,"k":"sumik","i":187},{"g":2,"t":"seria","c":4,"o":"Zbuduj serię 4 ryb tego samego gatunku","m":40.5,"i":188},{"g":2,"t":"gat","c":1,"o":"Złów 1 sztukę: BOLEŃ","m":41.0,"k":"bolen","i":189},{"g":2,"t":"nowy","c":3,"o":"Odkryj 3 nowe gatunki","m":42,"i":190},{"g":2,"t":"gat","c":1,"o":"Złów 1 sztukę: ŻABNICA","m":42.7,"k":"zabnica","i":191},{"g":2,"t":"gat","c":1,"o":"Złów 1 sztukę: MORŚWIN","m":43.5,"k":"morswin","i":192},{"g":2,"t":"gat","c":1,"o":"Złów 1 sztukę: ŻÓŁW BŁOTNY","m":43.8,"k":"zolw_blotny","i":193},{"g":2,"t":"gat","c":1,"o":"Złów 1 sztukę: TOŁPYGA","m":44.2,"k":"tolpyga","i":194},{"g":1,"t":"lawice","c":45,"o":"Wymień ławicę 45 razy","m":1.5,"i":195},{"g":1,"t":"utarg","c":4000,"o":"Utarguj 4000 qryb w ciągu doby","m":5.0,"i":196},{"g":3,"t":"gat","c":2,"o":"Złów 2 sztuki: MINÓG UKRAIŃSKI","m":47.9,"k":"minog_ukrainski","i":197},{"g":3,"t":"gat","c":1,"o":"Złów 1 sztukę: SIEJA","m":48.4,"k":"sieja","i":198},{"g":3,"t":"gat","c":2,"o":"Złów 2 sztuki: PSTRĄG POTOKOWY","m":54.3,"k":"pstrag","i":199},{"g":3,"t":"gat","c":4,"o":"Złów 4 sztuki: KARAŚ POSPOLITY","m":54.8,"k":"karas","i":200},{"g":3,"t":"gat","c":4,"o":"Złów 4 sztuki: SIELAWA","m":55.1,"k":"sielawa","i":201},{"g":1,"t":"sprzedaz","c":4000,"o":"Sprzedaj wiaderko za 4000 qryb w jednej transakcji","m":5.0,"i":202},{"g":3,"t":"gat","c":1,"o":"Złów 1 sztukę: PSTRĄG ŹRÓDLANY","m":59.6,"k":"pstrag_zrodlany","i":203},{"g":3,"t":"rekord","c":5,"o":"Pobij rekord życiowy 5 razy","m":60,"i":204},{"g":3,"t":"gat","c":2,"o":"Złów 2 sztuki: ŚLIZ","m":62.2,"k":"sliz","i":205},{"g":3,"t":"gat","c":4,"o":"Złów 4 sztuki: JAŹ","m":64.1,"k":"jaz","i":206},{"g":3,"t":"gat","c":1,"o":"Złów 1 sztukę: PIEKIELNICA","m":65.7,"k":"piekielnica","i":207},{"g":3,"t":"gat","c":2,"o":"Złów 2 sztuki: PSTRĄG TĘCZOWY","m":68.4,"k":"pstrag_teczowy","i":208},{"g":3,"t":"gat","c":2,"o":"Złów 2 sztuki: SUM","m":69.3,"k":"sum","i":209},{"g":3,"t":"nowy","c":5,"o":"Odkryj 5 nowych gatunków","m":70,"i":210},{"g":3,"t":"gat","c":2,"o":"Złów 2 sztuki: MASKINONG","m":73.3,"k":"muskellunge","i":211},{"g":3,"t":"gat","c":2,"o":"Złów 2 sztuki: PISKORZ","m":73.3,"k":"piskorz","i":212},{"g":3,"t":"gat","c":2,"o":"Złów 2 sztuki: BABKA","m":73.8,"k":"babki","i":213},{"g":3,"t":"gat","c":4,"o":"Złów 4 sztuki: KLEŃ","m":73.8,"k":"klen","i":214},{"g":3,"t":"srednia","c":42,"o":"Miej średnią powyżej 42 punktów na rybę","m":76.4,"i":215},{"g":3,"t":"gat","c":2,"o":"Złów 2 sztuki: WĘGORZ","m":76.5,"k":"wegorz","i":216},{"g":3,"t":"gat","c":2,"o":"Złów 2 sztuki: SUMIK KARŁOWATY","m":79.5,"k":"sumik","i":217},{"g":3,"t":"gatunki","c":25,"o":"Złów 25 różnych gatunków","m":80.0,"i":218},{"g":3,"t":"gat","c":1,"o":"Złów 1 sztukę: GŁOWACZ BIAŁOPŁETWY","m":80.0,"k":"glowacz_bialopletwy","i":219},{"g":3,"t":"gat","c":1,"o":"Złów 1 sztukę: STRZEBLA POTOKOWA","m":80.0,"k":"strzebla_potokowa","i":220},{"g":3,"t":"gat","c":1,"o":"Złów 1 sztukę: CIERNICZEK","m":80.0,"k":"cierniczek","i":221},{"g":3,"t":"gat","c":1,"o":"Złów 1 sztukę: KIEŁB KESSLERA","m":80.0,"k":"kielb_kesslera","i":222},{"g":3,"t":"gat","c":1,"o":"Złów 1 sztukę: STRZEBLA BŁOTNA","m":80.0,"k":"strzebla_blotna","i":223},{"g":3,"t":"gat","c":2,"o":"Złów 2 sztuki: BOLEŃ","m":82.1,"k":"bolen","i":224},{"g":3,"t":"olbrzym","c":3,"o":"Złów 3 olbrzymy","m":86.9,"i":225},{"g":3,"t":"gat","c":2,"o":"Złów 2 sztuki: ŻÓŁW BŁOTNY","m":87.7,"k":"zolw_blotny","i":226},{"g":3,"t":"gat","c":2,"o":"Złów 2 sztuki: TOŁPYGA","m":88.4,"k":"tolpyga","i":227},{"g":3,"t":"gat","c":1,"o":"Złów 1 sztukę: MINÓG STRUMIENIOWY","m":90.0,"k":"minog_strumieniowy","i":228},{"g":3,"t":"gat","c":2,"o":"Złów 2 sztuki: LIPIEŃ","m":92.4,"k":"lipien","i":229},{"g":3,"t":"gat","c":2,"o":"Złów 2 sztuki: CZEBACZEK AMURSKI","m":93.2,"k":"czebaczek","i":230},{"g":3,"t":"gat","c":4,"o":"Złów 4 sztuki: MINÓG UKRAIŃSKI","m":95.9,"k":"minog_ukrainski","i":231},{"g":3,"t":"gat","c":1,"o":"Złów 1 sztukę: BRZANKA","m":100.6,"k":"brzanka","i":232},{"g":3,"t":"gat","c":20,"o":"Złów 20 sztuk: UKLEJA","m":101.1,"k":"ukleja","i":233},{"g":3,"t":"gat","c":8,"o":"Złów 8 sztuk: KARP","m":104.9,"k":"karp","i":234},{"g":1,"t":"utarg","c":12000,"o":"Utarguj 12000 qryb w ciągu doby","m":5.0,"i":235},{"g":3,"t":"gat","c":8,"o":"Złów 8 sztuk: SZCZUPAK","m":106.6,"k":"szczupak","i":236},{"g":3,"t":"gat","c":4,"o":"Złów 4 sztuki: SANDACZ","m":108.0,"k":"sandacz","i":237},{"g":3,"t":"gat","c":4,"o":"Złów 4 sztuki: PSTRĄG POTOKOWY","m":108.5,"k":"pstrag","i":238},{"g":3,"t":"gat","c":8,"o":"Złów 8 sztuk: KARAŚ POSPOLITY","m":109.7,"k":"karas","i":239},{"g":3,"t":"gat","c":8,"o":"Złów 8 sztuk: SIELAWA","m":110.3,"k":"sielawa","i":240},{"g":3,"t":"gat","c":4,"o":"Złów 4 sztuki: MINÓG RZECZNY","m":114.6,"k":"minog_rzeczny","i":241},{"g":3,"t":"gatunki","c":30,"o":"Złów 30 różnych gatunków","m":115.1,"i":242},{"g":3,"t":"gat","c":4,"o":"Złów 4 sztuki: KOZA","m":117.2,"k":"koza","i":243},{"g":3,"t":"gat","c":4,"o":"Złów 4 sztuki: BARAKUDA","m":117.2,"k":"barakuda","i":244},{"g":3,"t":"gat","c":2,"o":"Złów 2 sztuki: PSTRĄG ŹRÓDLANY","m":119.3,"k":"pstrag_zrodlany","i":245},{"g":3,"t":"gat","c":4,"o":"Złów 4 sztuki: BRZANA","m":121.4,"k":"brzana","i":246},{"g":3,"t":"gat","c":20,"o":"Złów 20 sztuk: KARAŚ SREBRZYSTY","m":124.6,"k":"karas_srebrzysty","i":247},{"g":3,"t":"gat","c":1,"o":"Złów 1 sztukę: ŁOSOŚ","m":128.2,"k":"losos","i":248},{"g":3,"t":"gat","c":2,"o":"Złów 2 sztuki: PIEKIELNICA","m":131.5,"k":"piekielnica","i":249},{"g":3,"t":"gat","c":4,"o":"Złów 4 sztuki: SUM","m":138.6,"k":"sum","i":250},{"g":3,"t":"gat","c":1,"o":"Złów 1 sztukę: ROZDYMKA","m":140.0,"k":"rozdymka","i":251},{"g":3,"t":"gat","c":4,"o":"Złów 4 sztuki: KONIK MORSKI","m":145.5,"k":"konik_krysztalowy","i":252},{"g":3,"t":"gat","c":4,"o":"Złów 4 sztuki: MIĘTUS","m":145.5,"k":"mietus","i":253},{"g":3,"t":"gat","c":4,"o":"Złów 4 sztuki: MASKINONG","m":146.5,"k":"muskellunge","i":254},{"g":3,"t":"gat","c":1,"o":"Złów 1 sztukę: MAKAIRA","m":150.0,"k":"zagielnica","i":255},{"g":3,"t":"gat","c":4,"o":"Złów 4 sztuki: SUMIK KARŁOWATY","m":159.0,"k":"sumik","i":256},{"g":3,"t":"gat","c":1,"o":"Złów 1 sztukę: CIOSA","m":170.9,"k":"ciosa","i":257},{"g":3,"t":"gat","c":4,"o":"Złów 4 sztuki: TOŁPYGA","m":176.8,"k":"tolpyga","i":258},{"g":3,"t":"gat","c":2,"o":"Złów 2 sztuki: MINÓG STRUMIENIOWY","m":179.9,"k":"minog_strumieniowy","i":259},{"g":3,"t":"gat","c":4,"o":"Złów 4 sztuki: LIPIEŃ","m":184.8,"k":"lipien","i":260},{"g":3,"t":"gat","c":2,"o":"Złów 2 sztuki: KOZA ZŁOTAWA","m":186.5,"k":"koza_zlotawa","i":261},{"g":3,"t":"gat","c":4,"o":"Złów 4 sztuki: SIEJA","m":193.5,"k":"sieja","i":262},{"g":3,"t":"gat","c":2,"o":"Złów 2 sztuki: KIEŁB BIAŁOPŁETWY","m":205.1,"k":"kielb_bialopletwy","i":263},{"g":3,"t":"gatunki","c":42,"o":"Złów 42 różne gatunki","m":209.6,"i":264},{"g":3,"t":"gat","c":8,"o":"Złów 8 sztuk: PSTRĄG POTOKOWY","m":217.1,"k":"pstrag","i":265},{"g":3,"t":"gat","c":2,"o":"Złów 2 sztuki: GŁOWACZ PRĘGOPŁETWY","m":227.9,"k":"glowacz_pregopletwy","i":266},{"g":3,"t":"mit","c":1,"o":"Złów rybę mityczną","m":300.0,"i":267},{"g":3,"t":"gat","c":1,"o":"Złów 1 sztukę: TYRIOŚ MORSKI","m":320.0,"k":"tyrios_morski","i":268},{"g":3,"t":"gat","c":1,"o":"Złów 1 sztukę: DŻOŁEJ RUDOGRZYWY","m":320.0,"k":"dzolej_rudogrzywy","i":269},{"g":3,"t":"gat","c":1,"o":"Złów 1 sztukę: KSIĄŻNIK","m":320.0,"k":"ksiaznik","i":270},{"g":3,"t":"gat","c":1,"o":"Złów 1 sztukę: NESSY","m":320.0,"k":"nessy","i":271},{"g":3,"t":"gat","c":1,"o":"Złów 1 sztukę: JAPONIEC","m":320.0,"k":"japoniec","i":272},{"g":3,"t":"gat","c":1,"o":"Złów 1 sztukę: SMUCIOR","m":320.0,"k":"smucior","i":273},{"g":3,"t":"gat","c":1,"o":"Złów 1 sztukę: KUPID","m":320.0,"k":"kupid","i":274},{"g":3,"t":"gat","c":1,"o":"Złów 1 sztukę: SMOKOSZ","m":320.0,"k":"smokosz","i":275},{"g":1,"t":"karta","c":27,"o":"Złów rybę na 27 punktów lub więcej","m":0.8,"i":276},{"g":1,"t":"karta","c":33,"o":"Złów rybę na 33 punkty lub więcej","m":1.3,"i":277},{"g":1,"t":"waga","c":1500,"o":"Złów rybę ważącą co najmniej 1,5 kg","m":1.5,"i":278},{"g":1,"t":"dlugosc","c":50,"o":"Złów rybę o długości co najmniej 50 cm","m":1.6,"i":279},{"g":1,"t":"waga","c":2000,"o":"Złów rybę ważącą co najmniej 2 kg","m":1.9,"i":280},{"g":1,"t":"tier3","c":4,"o":"Złów 4 ryby pasma 3 lub wyżej","m":2.1,"i":281},{"g":1,"t":"dlugosc","c":60,"o":"Złów rybę o długości co najmniej 60 cm","m":2.5,"i":282},{"g":1,"t":"waga","c":3000,"o":"Złów rybę ważącą co najmniej 3 kg","m":2.6,"i":283},{"g":1,"t":"wypusc","c":10,"o":"Wypuść 10 ryb","m":2.6,"i":284},{"g":1,"t":"karta","c":39,"o":"Złów rybę na 39 punktów lub więcej","m":2.7,"i":285},{"g":1,"t":"waga","c":4000,"o":"Złów rybę ważącą co najmniej 4 kg","m":3.5,"i":286},{"g":1,"t":"dlugosc","c":70,"o":"Złów rybę o długości co najmniej 70 cm","m":4.0,"i":287},{"g":1,"t":"tier4","c":4,"o":"Złów 4 ryby pasma 4 lub wyżej","m":4.3,"i":288},{"g":1,"t":"waga","c":5000,"o":"Złów rybę ważącą co najmniej 5 kg","m":4.6,"i":289},{"g":1,"t":"gatunki","c":14,"o":"Złów 14 różnych gatunków","m":5.1,"i":290},{"g":1,"t":"tier3","c":10,"o":"Złów 10 ryb pasma 3 lub wyżej","m":5.2,"i":291},{"g":1,"t":"dokladnie","c":10,"o":"Złów rybę dokładnie na 10 punktów","m":6.0,"i":292},{"g":1,"t":"wypusc","c":25,"o":"Wypuść 25 ryb","m":6.4,"i":293},{"g":1,"t":"tier4","c":6,"o":"Złów 6 ryb pasma 4 lub wyżej","m":6.5,"i":294},{"g":1,"t":"dlugosc","c":80,"o":"Złów rybę o długości co najmniej 80 cm","m":6.9,"i":295},{"g":1,"t":"dokladnie","c":24,"o":"Złów rybę dokładnie na 24 punkty","m":7.5,"i":296},{"g":1,"t":"tier3","c":15,"o":"Złów 15 ryb pasma 3 lub wyżej","m":7.8,"i":297},{"g":1,"t":"gat","c":3,"o":"Złów 3 sztuki: SIELAWA","m":7.9,"k":"sielawa","i":298},{"g":1,"t":"tier2","c":25,"o":"Złów 25 ryb pasma 2 lub wyżej","m":8.3,"i":299},{"g":1,"t":"waga","c":8000,"o":"Złów rybę ważącą co najmniej 8 kg","m":9.3,"i":300},{"g":1,"t":"gat","c":1,"o":"Złów 1 sztukę: KRASNOPIÓRKA","m":9.5,"k":"krasnopiorka","i":301},{"g":1,"t":"dokladnie","c":16,"o":"Złów rybę dokładnie na 16 punktów","m":10.2,"i":302},{"g":1,"t":"wypusc","c":40,"o":"Wypuść 40 ryb","m":10.3,"i":303},{"g":1,"t":"dokladnie","c":19,"o":"Złów rybę dokładnie na 19 punktów","m":10.7,"i":304},{"g":1,"t":"tier4","c":10,"o":"Złów 10 ryb pasma 4 lub wyżej","m":10.8,"i":305},{"g":1,"t":"tier2","c":35,"o":"Złów 35 ryb pasma 2 lub wyżej","m":11.6,"i":306},{"g":2,"t":"dlugosc","c":90,"o":"Złów rybę o długości co najmniej 90 cm","m":12.0,"i":307},{"g":2,"t":"tier5","c":4,"o":"Złów 4 ryby pasma 5 lub wyżej","m":12.8,"i":308},{"g":2,"t":"karta","c":44,"o":"Złów rybę na 44 punkty lub więcej","m":12.9,"i":309},{"g":2,"t":"tier3","c":25,"o":"Złów 25 ryb pasma 3 lub wyżej","m":12.9,"i":310},{"g":2,"t":"gat","c":5,"o":"Złów 5 sztuk: SIELAWA","m":13.1,"k":"sielawa","i":311},{"g":2,"t":"dokladnie","c":30,"o":"Złów rybę dokładnie na 30 punktów","m":14.0,"i":312},{"g":2,"t":"wypusc","c":60,"o":"Wypuść 60 ryb","m":15.4,"i":313},{"g":2,"t":"tier4","c":15,"o":"Złów 15 ryb pasma 4 lub wyżej","m":16.2,"i":314},{"g":2,"t":"dokladnie","c":36,"o":"Złów rybę dokładnie na 36 punktów","m":16.8,"i":315},{"g":2,"t":"zlow","c":70,"o":"Złów 70 ryb","m":17.9,"i":316},{"g":2,"t":"waga","c":12000,"o":"Złów rybę ważącą co najmniej 12 kg","m":18.8,"i":317},{"g":2,"t":"gat","c":2,"o":"Złów 2 sztuki: KRASNOPIÓRKA","m":19.1,"k":"krasnopiorka","i":318},{"g":2,"t":"tier5","c":6,"o":"Złów 6 ryb pasma 5 lub wyżej","m":19.2,"i":319},{"g":2,"t":"dlugosc","c":100,"o":"Złów rybę o długości co najmniej 100 cm","m":19.9,"i":320},{"g":2,"t":"gat","c":8,"o":"Złów 8 sztuk: KRĄP","m":21.6,"k":"krap","i":321},{"g":2,"t":"gat","c":3,"o":"Złów 3 sztuki: JAŹ","m":23.0,"k":"jaz","i":322},{"g":2,"t":"karta","c":47,"o":"Złów rybę na 47 punktów lub więcej","m":23.1,"i":323},{"g":2,"t":"gat","c":3,"o":"Złów 3 sztuki: KLEŃ","m":23.1,"k":"klen","i":324},{"g":2,"t":"punkty","c":2000,"o":"Uzbieraj 2000 punktów","m":24.1,"i":325},{"g":2,"t":"gat","c":3,"o":"Złów 3 sztuki: SZCZUPAK","m":25.1,"k":"szczupak","i":326},{"g":2,"t":"wypusc","c":100,"o":"Wypuść 100 ryb","m":25.6,"i":327},{"g":2,"t":"gat","c":10,"o":"Złów 10 sztuk: SIELAWA","m":26.2,"k":"sielawa","i":328},{"g":2,"t":"gat","c":3,"o":"Złów 3 sztuki: KARP","m":27.5,"k":"karp","i":329},{"g":2,"t":"waga","c":15000,"o":"Złów rybę ważącą co najmniej 15 kg","m":28.6,"i":330},{"g":2,"t":"gat","c":3,"o":"Złów 3 sztuki: KRASNOPIÓRKA","m":28.6,"k":"krasnopiorka","i":331},{"g":2,"t":"gat","c":3,"o":"Złów 3 sztuki: SŁONECZNICA","m":28.7,"k":"slonecznica","i":332},{"g":2,"t":"zlow","c":120,"o":"Złów 120 ryb","m":30.8,"i":333},{"g":2,"t":"gat","c":8,"o":"Złów 8 sztuk: OKOŃ","m":31.6,"k":"okon","i":334},{"g":2,"t":"tier5","c":10,"o":"Złów 10 ryb pasma 5 lub wyżej","m":32.0,"i":335},{"g":2,"t":"dlugosc","c":110,"o":"Złów rybę o długości co najmniej 110 cm","m":32.1,"i":336},{"g":2,"t":"punkty","c":2800,"o":"Uzbieraj 2800 punktów","m":33.8,"i":337},{"g":2,"t":"gat","c":10,"o":"Złów 10 sztuk: LESZCZ","m":36.1,"k":"leszcz","i":338},{"g":2,"t":"wypusc","c":150,"o":"Wypuść 150 ryb","m":38.5,"i":339},{"g":2,"t":"gat","c":15,"o":"Złów 15 sztuk: KRĄP","m":40.4,"k":"krap","i":340},{"g":2,"t":"gat","c":10,"o":"Złów 10 sztuk: UKLEJA","m":40.9,"k":"ukleja","i":341},{"g":2,"t":"zlow","c":160,"o":"Złów 160 ryb","m":41.0,"i":342},{"g":2,"t":"gat","c":5,"o":"Złów 5 sztuk: SZCZUPAK","m":41.9,"k":"szczupak","i":343},{"g":2,"t":"gat","c":5,"o":"Złów 5 sztuk: CIERNIK","m":43.7,"k":"ciernik","i":344},{"g":2,"t":"gat","c":8,"o":"Złów 8 sztuk: PŁOĆ","m":44.3,"k":"ploc","i":345},{"g":3,"t":"gat","c":5,"o":"Złów 5 sztuk: KARP","m":45.9,"k":"karp","i":346},{"g":3,"t":"gat","c":6,"o":"Złów 6 sztuk: JAŹ","m":46.0,"k":"jaz","i":347},{"g":3,"t":"gat","c":6,"o":"Złów 6 sztuk: KLEŃ","m":46.3,"k":"klen","i":348},{"g":3,"t":"gat","c":5,"o":"Złów 5 sztuk: KRASNOPIÓRKA","m":47.7,"k":"krasnopiorka","i":349},{"g":3,"t":"gat","c":5,"o":"Złów 5 sztuk: SŁONECZNICA","m":47.9,"k":"slonecznica","i":350},{"g":3,"t":"punkty","c":4000,"o":"Uzbieraj 4000 punktów","m":48.3,"i":351},{"g":3,"t":"dlugosc","c":120,"o":"Złów rybę o długości co najmniej 120 cm","m":50.6,"i":352},{"g":3,"t":"zlow","c":200,"o":"Złów 200 ryb","m":51.3,"i":353},{"g":3,"t":"waga","c":20000,"o":"Złów rybę ważącą co najmniej 20 kg","m":51.3,"i":354},{"g":3,"t":"wypusc","c":200,"o":"Wypuść 200 ryb","m":51.3,"i":355},{"g":3,"t":"gat","c":20,"o":"Złów 20 sztuk: SIELAWA","m":52.3,"k":"sielawa","i":356},{"g":3,"t":"gat","c":5,"o":"Złów 5 sztuk: LIN","m":52.8,"k":"lin","i":357},{"g":3,"t":"gat","c":20,"o":"Złów 20 sztuk: KRĄP","m":53.9,"k":"krap","i":358},{"g":3,"t":"gat","c":6,"o":"Złów 6 sztuk: KARAŚ POSPOLITY","m":56.8,"k":"karas","i":359},{"g":3,"t":"gat","c":15,"o":"Złów 15 sztuk: OKOŃ","m":59.2,"k":"okon","i":360},{"g":3,"t":"punkty","c":5000,"o":"Uzbieraj 5000 punktów","m":60.3,"i":361},{"g":3,"t":"zlow","c":250,"o":"Złów 250 ryb","m":64.1,"i":362},{"g":3,"t":"gat","c":8,"o":"Złów 8 sztuk: CIERNIK","m":69.9,"k":"ciernik","i":363},{"g":3,"t":"gat","c":20,"o":"Złów 20 sztuk: LESZCZ","m":72.3,"k":"leszcz","i":364},{"g":3,"t":"zlow","c":300,"o":"Złów 300 ryb","m":76.9,"i":365},{"g":3,"t":"punkty","c":6500,"o":"Uzbieraj 6500 punktów","m":78.4,"i":366},{"g":3,"t":"gat","c":20,"o":"Złów 20 sztuk: OKOŃ","m":78.9,"k":"okon","i":367},{"g":3,"t":"gat","c":15,"o":"Złów 15 sztuk: PŁOĆ","m":83.1,"k":"ploc","i":368},{"g":3,"t":"gat","c":8,"o":"Złów 8 sztuk: LIN","m":84.4,"k":"lin","i":369},{"g":3,"t":"gat","c":8,"o":"Złów 8 sztuk: JAZGARZ","m":92.5,"k":"jazgarz","i":370},{"g":3,"t":"tier6","c":4,"o":"Złów 4 ryby pasma 6 lub wyżej","m":102.8,"i":371},{"g":3,"t":"gat","c":8,"o":"Złów 8 sztuk: KIEŁB","m":103.3,"k":"kielb","i":372},{"g":3,"t":"gat","c":10,"o":"Złów 10 sztuk: KARAŚ SREBRZYSTY","m":106.2,"k":"karas_srebrzysty","i":373},{"g":3,"t":"gat","c":30,"o":"Złów 30 sztuk: UKLEJA","m":122.6,"k":"ukleja","i":374},{"g":3,"t":"gat","c":30,"o":"Złów 30 sztuk: PŁOĆ","m":166.2,"k":"ploc","i":375}];

/* ============================================================
   ZADANIA DZIENNE.

   376 zadan w tablicy ZADANIA: 125 jednogwiazdkowych, 144 dwu, 107 trzy.
   Nagrody 50 000, 200 000 i 800 000 qryb (NAGRODA nizej, od 10 X 2026).

   100 NOWYCH ZADAN (8 X 2026, polecenie Andrzeja: "dodaj 100 nowych
   zadan"), numery 276-375 na koncu tablicy, wiec zestawy dnia sprzed
   zmiany zostaja razem z postepem (stan). Nowe rodzaje: dlugosc i waga
   jednej ryby (karta zglaszala je od dawna, ale nie bylo ani jednego
   zadania), wypuszczanie ryb ('wypusc' z decyzjaKarty w src/card/card.js),
   KRASNOPIORKA (gatunek bez zadan), a do tego wyzsze progi zlowien,
   punktow, kart i pasm, trafienia dokladne i gatunki pasm 1-2. Czas
   kazdego (m przed finalem, GWIAZDKI_PO_FINALE po finale) liczy ten sam
   model polowu co reszte (tools/zadania_po_finale.py); po finale kazde
   miesci sie w 320 min, najdluzsze ok. 250 min.
   Gwiazdka liczy sie z CZASU wykonania (do 12 minut, do 45, powyzej),
   a nie z widzimisie -- dzieki temu pula sama sie sortuje, gdy dochodza
   nowe pozycje.

   NA DOBE WYPADA PIEC (ILE_NA_DOBE). Wybor idzie z ZIARNA Z DATY, wiec
   kazdy gracz dostaje tego samego dnia ten sam zestaw i mozna o nim
   rozmawiac na grupie. Odswiezenie (KOSZT_ODSWIEZENIA) dosypuje ziarno,
   wiec nowy zestaw jest inny, ale nadal deterministyczny.

   Postep liczy sie z tych samych zdarzen, ktore i tak przechodza przez zapis,
   wiec zadania nie wymagaja zadnej dodatkowej ksiegowosci w petli gry.
   Liczniki dobowe zeruja sie o polnocy razem z reszta statystyk.
   ============================================================ */
const Zadania = (() => {
  /* ============================================================
     NAGRODY PRZELICZONE NA EKONOMIE, KTORA JUZ ZYJE.
     Gdy zadania powstawaly, jedynym zrodlem qryb byly rekordy i progi doby,
     wiec sto qryb za zadanie bylo sensowna stawka. Potem doszla gielda:
     jedno wiaderko przecietnych ryb idzie za 150-1000 qryb, a wiaderko
     z trofeum potrafi pojsc za ponad dwa tysiace. Sto qryb za zadanie
     dnia znaczylo wiec mniej niz jedna sprzedaz -- czyli nic.

     Punkt odniesienia dla nowych stawek: najtansza zaneta kosztuje 50 000.
     Dzien z kompletem pieciu zadan ma dawac mniej wiecej tyle, zeby dwa
     dobre dni starczyly na nia bez lowienia pod wiaderko. Stad 1000 /
     5000 / 25 000, przy sredniej dobowej okolo 30-40 tysiecy.
     Odswiezenie idzie w gore w tej samej proporcji: ma bolec tyle samo
     co wczesniej, czyli mniej wiecej jedno zadanie jednogwiazdkowe.
     ============================================================ */
  /* ============================================================
     NAGRODY x40 (8 X 2026, polecenie Andrzeja: "zwieksz tylko nagrody
     za zlecenia i zadania. Dostosowane do ekonomii gry").
     Stawki 7 000 / 35 000 / 175 000 placily okolo 1 300 qryb za minute
     zadania, a zwykla gra po finale ZARAZY placi okolo 53 000 qryb za
     minute (3,2 mln na godzine, docs/audyt-ekonomii.md). Mnoznik 40 daje
     zadaniu mniej wiecej tyle, ile zwykla gra w tym samym czasie, a ryby
     z tego czasu i tak zostaja graczowi. Przed finalem gra placi 14 razy
     wiecej, wiec tam zadania zostaja dodatkiem.
     Odswiezenie rosnie tak samo (28 000 -> 1 120 000). Przy starej cenie
     dokupowanie zestawow za ulamek nagrody dawaloby zarobek bez lowienia.
     Razem z mnoznikiem gwiazdki z czasu dostalo 10 zadan, ktore robi sie
     w kilka minut, a mialy 2-3 gwiazdki: sprzedaz i utarg (jedna wizyta
     handlarza, do 5 min), 10 ryb naraz w wiaderku (2,6 min) i wymiana
     lawicy 15-45 razy (licza sie tylko nacisniecia przycisku, ok. 2 s).
     Pomiar i rachunek: docs/ekonomia-po-finale.md.
     ============================================================ */
  /* ============================================================
     EKONOMIA CALEJ GRY (10 X 2026, polecenie Andrzeja: "Duzo za duzo
     zarabia sie w stosunku do zakupow. Napraw ekonomie calej gry.
     Bazujac na najskuteczniejszych przykladach ze swiata gier").
     Zasady i pomiar: docs/ekonomia-gry.md, model tools/ekonomia_model.py.

     ZMIERZONE PRZED ZMIANA (jezioro po finale): zadania x40 dawaly
     graczowi 90 minut dziennie 14,7 mln na dobe, a polow 3,4 mln. Piec
     zadan idzie rownolegle, a nowy zestaw za 1 120 000 byl wart ok. 13 mln,
     wiec odswiezanie bez limitu bylo najlepsza "praca" w grze. Paczka
     podstawowa kosztowala 5-8 minut gry, ciastko niecala godzine.

     JEST, wedlug dwoch wzorcow:
     - zadania dzienne to dodatek do lowienia, nie glowne zrodlo (ok. 25-30%
       zarobku): 50 000 / 200 000 / 800 000, czyli podobnie za minute
       zadania przy kazdej liczbie gwiazdek,
     - wymiana zadan ma limit jak w Hearthstone (jedna wymiana dziennie):
       pierwsze odswiezenie w dobie kosztuje KOSZT_ODSWIEZENIA, kazde
       kolejne tego samego dnia MNOZNIK_ODSWIEZENIA razy wiecej (150 000,
       300 000, 600 000...). Licznik to `obrot` zestawu dnia, ktory zeruje
       sie o polnocy razem z nowym zestawem.
     Model po zmianie: zadania 23-32% zarobku, gracz 90 min/dobe ok. 1,4
     odswiezenia na dobe.
     ============================================================ */
  const NAGRODA = { 1: 50000, 2: 200000, 3: 800000 }, KOSZT_ODSWIEZENIA = 150000;
  const MNOZNIK_ODSWIEZENIA = 2;
  const ILE_NA_DOBE = 5;

  /* ============================================================
     ZADANIA OD FINALU ZARAZY (pt 9 X 23:00; polecenie Andrzeja z 8 X 2026,
     11:06: "popraw ekonomie zadan i zlecen, bo teraz sa nieoplacalne").

     Po finale jezioro ma 10% ryb, ryby z pasm 3-7 trafiaja do lawicy jako
     goscie z szansa rowna udzialowi w jeziorze (LOS_LAWICY w
     src/fish/fish-core.js), a lawica ma 5-14 ryb. Zadania na rzadkie
     gatunki, wysokie karty i duzo punktow trwaja wiec dluzej, a niektore
     przestaja byc do zrobienia w ciagu dnia.

     Zasada zostaje ta sama co wyzej: gwiazdka (czyli nagroda) liczy sie
     z CZASU wykonania, do 12 min 1, do 45 min 2, dluzej 3. Czas po finale
     zmierzony na modelu polowu (lawica co minute, 4 zlowienia na lawice,
     wybor ryby przez pickLure, 200 000 zlowien na stan jeziora, tempo
     3,9 zlowienia na minute jak w kolumnie m). Bierzemy wiekszy z dwoch
     szacunkow: m razy zmiana czasu w modelu (jezioro w normie przed
     finalem wobec jeziora po finale) albo czas wprost z modelu po finale.
     Zadanie, ktore po finale trwaloby dluzej niz najdluzsze zadanie przed
     finalem (320 min), wypada z losowania dnia.

     GWIAZDKI_PO_FINALE: indeks = numer zadania (pole i), wartosc 1-3 to
     gwiazdki po finale, 0 to zadanie spoza losowania. Wynik: 282 zadania
     w puli (102 / 99 / 81 z 1 / 2 / 3 gwiazdkami: 182 dawne po
     przeliczeniu 10 zadan z 8 X, 14:50, i 100 nowych z 8 X, 15:13,
     z gwiazdkami 24 / 42 / 34), 94 wypada (83 na rzadkie
     gatunki, ryba mityczna, 3 trafienia dokladnie w 44-54 punkty, 25-42
     rozne gatunki, 3 i 5 nowych gatunkow, 8 ryb pasma 6+, srednia
     powyzej 42). Przy nagrodach x40 cala pula placi okolo 58 000 qryb
     za minute zadania przed finalem i 56 000 po finale (zwykla gra po
     finale: 53 000). Kolejny przebieg narzedzia rozni sie od tej tabeli
     kilkoma dawnymi zadaniami na rzadkie gatunki tuz przy granicy 320 min
     (rozrzut losowania); 100 nowych zgadza sie co do jednego.
     Tabele liczy tools/zadania_po_finale.py; opis docs/ekonomia-po-finale.md.
     ============================================================ */
  const GWIAZDKI_PO_FINALE = [
    1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,1,3,1,1,1,3,2,3,3,1,
    3,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,3,1,2,2,3,2,2,1,1,2,1,2,1,2,1,1,1,1,3,1,3,1,3,2,2,2,2,2,
    2,2,1,3,2,3,1,1,2,0,1,2,2,1,2,2,2,3,2,0,2,2,2,2,1,2,3,2,2,1,3,2,0,2,2,0,3,2,1,2,2,2,2,3,3,2,
    3,2,3,3,0,2,0,0,1,3,3,3,0,3,0,3,2,2,2,3,0,0,0,0,0,3,3,0,0,3,2,2,2,0,0,3,0,3,2,2,0,3,3,2,0,3,
    0,3,2,0,2,0,0,0,0,0,0,1,1,0,0,0,3,2,1,0,3,0,3,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,
    0,0,0,3,3,1,3,0,0,3,3,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,2,2,2,2,1,1,2,1,1,1,1,2,2,2,3,2,2,1,2,2,2,2,2,3,2,3,3,2,
    2,3,2,2,2,2,2,2,3,2,2,2,2,3,3,3,2,2,2,2,2,2,2,2,2,3,3,2,3,3,3,3,3,3,2,3,2,3,2,3,3,3,3,3,3,3,
    3,3,3,3,3,3,3,3
  ];
  const PO_FINALE = { wlaczony: true, od: window.QRYBY_FINAL_ZARAZY || Date.parse('2026-10-09T23:00:00+02:00') };
  function poFinale(teraz) { return !!PO_FINALE.wlaczony && (teraz || Date.now()) >= PO_FINALE.od; }
  /* Gwiazdki zadania wedlug zasad obowiazujacych teraz. Zadanie spoza puli,
     ktore zostalo w zestawie dnia z czasu przed finalem, placi jak trzy. */
  function gwiazdki(Z) {
    if (!Z) return 1;
    if (!poFinale()) return Z.g;
    const g = GWIAZDKI_PO_FINALE[Z.i];
    return g === 0 ? 3 : (g || Z.g);
  }
  function nagroda(Z) { return NAGRODA[gwiazdki(Z)]; }
  function wPuli(Z) { return !!Z && (!poFinale() || GWIAZDKI_PO_FINALE[Z.i] !== 0); }

  /* Prosty generator z ziarna, zeby ten sam dzien dawal ten sam zestaw. */
  function ziarno(txt) {
    let h = 2166136261;
    for (let i = 0; i < txt.length; i++) { h ^= txt.charCodeAt(i); h = Math.imul(h, 16777619); }
    return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h ^= h >>> 13; return (h >>> 0) / 4294967296; };
  }
  /* ============================================================
     PIEC ZADAN, LOSOWANYCH Z CALEJ PULI.
     Wczesniej dzien mial sztywno jedno latwe, jedno srednie i jedno trudne.
     Teraz kazde z pieciu ciagnie sie z tego samego worka, wiec moze trafic
     sie piec latwych albo piec trudnych. Proporcje puli robia reszte:
     125 jednogwiazdkowych, 144 dwu i 107 trzy, wiec dzien z samymi trudnymi
     jest mozliwy, ale rzadki.
     Powtorki w obrebie dnia sa odsiewane, zeby nie wypadlo dwa razy to samo.
     ============================================================ */
  function wybierz(dzien, obrot) {
    const r = ziarno(dzien + '#' + obrot), lista = [];
    let ochrona = 0;
    while (lista.length < ILE_NA_DOBE && ochrona++ < 200) {
      const kand = ZADANIA[Math.floor(r() * ZADANIA.length)];
      if (!kand || lista.indexOf(kand.i) >= 0 || !wPuli(kand)) continue;
      lista.push(kand.i);
    }
    return lista;
  }
  function stan() {
    if (typeof Zapis === 'undefined') return null;
    Zapis.nowaDoba();
    const d = Zapis.dane();
    const dzien = d.stat.doba;
    /* ============================================================
       ZESTAW DNIA MUSI PASOWAC DO OBECNEJ PULI.

       Numery zadan sa indeksami w tablicy ZADANIA. Gdy pula sie zmienia,
       a zapis pamieta wczorajsze numery, moga one wskazywac na zadania,
       ktorych juz nie ma: ZADANIA[id] wychodzi undefined i panel wywala
       sie przy pierwszym odczycie gwiazdek.

       Stad znacznik wersji puli w zapisie. Kazda zmiana liczby zadan albo
       liczby zadan na dobe uniewaznia zestaw i losuje go od nowa, zamiast
       udawac, ze stare numery cos jeszcze znacza.
       ============================================================ */
    const wersjaPuli = ZADANIA.length + 'x' + ILE_NA_DOBE;
    /* 100 NOWYCH ZADAN NA KONCU TABLICY (8 X 2026, 276 -> 376). Numery
       z zestawu sprzed tej zmiany dalej wskazuja te same zadania, wiec
       zestaw dnia zostaje razem z postepem, zamiast losowac sie od nowa. */
    if (d.zadania && d.zadania.w === '276x' + ILE_NA_DOBE && ZADANIA.length >= 276) d.zadania.w = wersjaPuli;
    const zly = d.zadania && (
      d.zadania.w !== wersjaPuli ||
      !Array.isArray(d.zadania.lista) ||
      d.zadania.lista.length !== ILE_NA_DOBE ||
      d.zadania.lista.some(i => !ZADANIA[i]));
    if (!d.zadania || d.zadania.dzien !== dzien || zly) {
      /* Nowa doba albo nowa pula: wykonane, ale nieodebrane zadania
         starego zestawu wyplacaja sie same (wyplacZalegle nizej). */
      const zalegle = wyplacZalegle(d.zadania);
      const pusteN = () => new Array(ILE_NA_DOBE).fill(0);
      d.zadania = { dzien: dzien, w: wersjaPuli, obrot: 0, lista: wybierz(dzien, 0),
                    postep: pusteN(), gotowe: pusteN(), odebrane: pusteN() };
      Zapis.zapisz();
      if (zalegle > 0) setTimeout(() => {
        try { if (typeof Ruch !== 'undefined' && Ruch.zaRekord) Ruch.zaRekord(zalegle, ['NIEODEBRANE ZADANIA']); } catch (e) {}
      }, 1200);
    }
    return d.zadania;
  }
  /* ============================================================
     NIC WYKONANEGO NIE PRZEPADA (8 X 2026, polecenie Andrzeja:
     "napraw", po audycie ekonomii, punkt W5).
     Zestaw dnia znika w trzech miejscach: odswiezenie, nowa doba i zmiana
     puli. Kazde z nich kasowalo tez zadania wykonane, ale nieodebrane,
     a przy nagrodach do 7 mln jedno klikniecie ODSWIEZ zabieralo do
     35 mln. Teraz przed wymiana zestawu takie zadania wyplacaja sie same,
     po stawce z chwili wyplaty (nagroda).
     ============================================================ */
  function zalegleQryby(z) {
    if (!z || !Array.isArray(z.lista) || !Array.isArray(z.gotowe)) return 0;
    let suma = 0;
    z.lista.forEach((id, n) => {
      const Z = ZADANIA[id];
      if (Z && z.gotowe[n] && !(Array.isArray(z.odebrane) && z.odebrane[n])) suma += nagroda(Z);
    });
    return suma;
  }
  function wyplacZalegle(z) {
    const suma = zalegleQryby(z);
    if (!(suma > 0) || typeof Zapis === 'undefined') return 0;
    if (!Array.isArray(z.odebrane)) z.odebrane = new Array(z.lista.length).fill(0);
    z.lista.forEach((id, n) => { if (ZADANIA[id] && z.gotowe[n]) z.odebrane[n] = 1; });
    const D = Zapis.dane();
    D.monety = (D.monety || 0) + suma;
    return suma;
  }
  /* Odswiezenie: najpierw wyplata wykonanych zadan, potem oplata. Wyplata
     liczy sie do oplaty, wiec gracz z gotowym zadaniem moze odswiezyc,
     nawet gdy samo saldo nie wystarcza. Zwraca { wyplacono } albo false. */
  /* Koszt najblizszego odswiezenia w tej dobie: kazde kolejne
     MNOZNIK_ODSWIEZENIA razy drozsze (opis przy NAGRODA). */
  function kosztOdswiezenia() {
    const z = stan();
    const n = (z && z.obrot) || 0;
    return Math.round(KOSZT_ODSWIEZENIA * Math.pow(MNOZNIK_ODSWIEZENIA, n));
  }
  function odswiez() {
    const z = stan(), d = Zapis.dane();
    if (!z) return false;
    const koszt = kosztOdswiezenia();
    if ((d.monety || 0) + zalegleQryby(z) < koszt) return false;
    const wyplacono = wyplacZalegle(z);
    d.monety -= koszt;
    z.obrot++; z.lista = wybierz(z.dzien, z.obrot);
    const pusteN = () => new Array(ILE_NA_DOBE).fill(0);
    z.postep = pusteN(); z.gotowe = pusteN(); z.odebrane = pusteN();
    Zapis.zapisz();
    return { wyplacono: wyplacono, koszt: koszt };
  }
  /* Ile qryb czeka w wykonanych, a nieodebranych zadaniach (panel: czy
     wolno odswiezyc). */
  function doOdbioruQryb() { return zalegleQryby(stan()); }
  /* Dolozenie postepu. typ i wartosc opisuja ZDARZENIE, nie zadanie:
     jedno zlowienie moze ruszyc kilka zadan naraz. */
  function zdarzenie(typ, ile, gat) {
    const z = stan(); if (!z) return [];
    const zrobione = [];
    /* Trzy tablice licznikow musza miec te sama dlugosc co lista. */
    for (const pole of ['postep', 'gotowe', 'odebrane'])
      if (!Array.isArray(z[pole]) || z[pole].length !== ILE_NA_DOBE)
        z[pole] = new Array(ILE_NA_DOBE).fill(0);
    z.lista.forEach((id, n) => {
      const Z = ZADANIA[id];
      if (!Z || z.gotowe[n]) return;
      let dodaj = 0;
      if (Z.t === typ) {
        if (Z.t === 'gat') dodaj = (gat === Z.k) ? ile : 0;
        /* Zadania na WARTOSC DOKLADNA i na PROGI liczone maksimum, nie suma:
           'dokladnie 54' spelnia sie jedna ryba, a nie zbieraniem punktow. */
        else dodaj = ile;
      }
      if (!dodaj) return;
      /* Zadania na rekord jednorazowy trzymaja maksimum, nie sume. */
      if (typ === 'dokladnie') {
        /* Trafienie CO DO PUNKTU: albo ta ryba ma dokladnie tyle, albo nic. */
        if (dodaj === Z.c) z.postep[n] = Z.c;
      }
      /* 'sprzedaz' i 'wiadro' licza sie MAKSIMUM, nie suma: jedna transakcja
         za tysiac spelnia prog tysiaca, a dwie po piecset juz nie. Tak samo
         wiaderko -- liczy sie stan naraz, nie suma wrzuconych ryb.
         'utarg' zostaje suma, bo to obrot calej doby. */
      else if (typ === 'karta' || typ === 'dlugosc' || typ === 'waga' ||
               typ === 'gatunki' || typ === 'seria' || typ === 'srednia' ||
               typ === 'lawice' || typ === 'sprzedaz' || typ === 'wiadro')
        z.postep[n] = Math.max(z.postep[n], dodaj);
      else z.postep[n] += dodaj;
      /* Zadanie wykonane nie wyplaca sie samo. Czeka na odbior: ikona
         zadan zapala sie innym kolorem i dostaje wykrzyknik, a monety
         przesypuja sie na konto dopiero po dotknieciu. */
      if (z.postep[n] >= Z.c) { z.gotowe[n] = 1; zrobione.push(Z); }
    });
    Zapis.zapisz();
    return zrobione;
  }
  function odbierz(n) {
    const z = stan(); if (!z || !z.gotowe[n] || z.odebrane[n]) return 0;
    const Z = ZADANIA[z.lista[n]];
    z.odebrane[n] = 1;
    const ile = nagroda(Z);
    Zapis.dane().monety = (Zapis.dane().monety || 0) + ile;
    Zapis.zapisz();
    return ile;
  }
  /* Ile nagrod czeka na odbior. HUD pyta o to co pol sekundy. */
  function doOdbioru() {
    const z = stan(); if (!z || !z.gotowe) return 0;
    let n = 0;
    for (let i = 0; i < z.lista.length; i++) if (z.gotowe[i] && !z.odebrane[i]) n++;
    return n;
  }
  const wszystkieZrobione = () => { const z = stan(); return z && z.odebrane.every(Boolean); };
  const opis = n => { const z = stan(); return z ? ZADANIA[z.lista[n]] : null; };
  return { stan, odswiez, zdarzenie, odbierz, doOdbioru, doOdbioruQryb, wszystkieZrobione, opis,
           NAGRODA, KOSZT_ODSWIEZENIA, MNOZNIK_ODSWIEZENIA, kosztOdswiezenia, ILE: () => ZADANIA.length,
           gwiazdki, nagroda, wPuli, poFinale, PO_FINALE, GWIAZDKI_PO_FINALE, wybierz };
})();
window.Zadania = Zadania;

window.QRYBY_MIX = function () {
  /* Tier liczy sie z okazu, wiec panel sumuje tiery ryb, nie tiery gatunkow. */
  const w = { razem: MIX.razem, tiery: {}, gatunki: {}, odrzucone: MIX.odrzucone };
  for (const t in MIX.tier) w.tiery[t] = +(100 * MIX.tier[t] / MIX.razem).toFixed(2);
  for (const k in MIX.spawn) w.gatunki[k] = +(100 * MIX.spawn[k] / MIX.razem).toFixed(2);
  const teraz = {};
  for (const f of school) { const t = f.tier || 1; teraz[t] = (teraz[t] || 0) + 1; }
  w.wKadrze = teraz;
  console.table(w.tiery); console.log(w);
  return w;
};
