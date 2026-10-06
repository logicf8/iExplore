document.addEventListener("DOMContentLoaded", () => {
    const processBtn = document.getElementById("processBtn");
    const inputText = document.getElementById("inputText");
    const sortArticleHeader = document.getElementById("sortArticle");
    const sortWeekHeader = document.getElementById("sortWeek");

    // Håll koll på aktuell data och sorteringstillstånd
    let currentArticles = [];
    let sortState = {
        column: 'article', // 'article' eller 'week'
        articleAsc: true,  // true = A-Ö, false = Ö-A
        weekAsc: true      // true = 1-99, false = 99-1
    };

    processBtn.addEventListener("click", () => {
        const text = inputText.value;
        const lines = text.split("\n").map(line => line.trim());

        const startMarker = "Items unavailable with current service will be moved to new draft order";
        const stopMarkers = [
            "Spara", "Skip to Tabs", "Varukorg", "Skapa ny varukorg", 
            "Sessioner", "Skip to Services", "Order", "Bifogade filer", "Skip to Articles"
        ];

        const startIndex = lines.findIndex(line => line === startMarker);
        
        if (startIndex === -1) {
            alert("Kunde inte hitta raden som startar listan.");
            return;
        }

        let filteredLines = [];
        
        for (let i = startIndex + 1; i < lines.length; i++) {
            const line = lines[i];

            if (stopMarkers.some(marker => line === marker)) {
                break;
            }

            if (line === "" || line.endsWith("inte tillgänglig")) {
                continue;
            }

            filteredLines.push(line);
        }

        const articlesMap = {};

        for (let i = 0; i < filteredLines.length; i += 3) {
            if (i + 2 >= filteredLines.length) break;

            const line1 = filteredLines[i];     
            const line2 = filteredLines[i + 1]; 
            const line3 = filteredLines[i + 2]; 

            const match = line1.match(/^(\d+)\s*x\s+(.+)$/);
            if (!match) continue;

            const quantity = parseInt(match[1], 10);
            const name = match[2].trim();
            const artNr = line3;
            const displayText = `${name} ${line2}`;

            if (articlesMap[artNr]) {
                articlesMap[artNr].quantity += quantity;
            } else {
                articlesMap[artNr] = {
                    id: artNr,
                    name: name,
                    displayText: displayText,
                    artNr: artNr,
                    quantity: quantity,
                    week: "",
                    note: "",
                    checked: false
                };
            }
        }

        currentArticles = Object.values(articlesMap);

        if (currentArticles.length === 0) {
            alert("Inga giltiga artiklar hittades i texten.");
            return;
        }

        // Dölj textfältet och knappen
        inputText.classList.add("hidden");
        processBtn.classList.add("hidden");

        // Initial sortering: Artikel A-Ö
        sortState.column = 'article';
        sortState.articleAsc = true;
        sortState.weekAsc = true;
        
        applySortAndRender();
    });

    // Klick på Artikel-rubrik
    sortArticleHeader.addEventListener("click", () => {
        saveCurrentInputState();
        if (sortState.column === 'article') {
            sortState.articleAsc = !sortState.articleAsc;
        } else {
            sortState.column = 'article';
            sortState.articleAsc = true; // starta A-Ö
        }
        applySortAndRender();
    });

    // Klick på Datum/V.-rubrik
    sortWeekHeader.addEventListener("click", () => {
        saveCurrentInputState();
        if (sortState.column === 'week') {
            sortState.weekAsc = !sortState.weekAsc;
        } else {
            sortState.column = 'week';
            sortState.weekAsc = true; // initialt 1-99 / äldst först
        }
        applySortAndRender();
    });

    // Spara vad användaren har skrivit i fälten innan om-sortering
    function saveCurrentInputState() {
        const rows = document.querySelectorAll("#resultTable tbody tr");
        rows.forEach(row => {
            const id = row.dataset.id;
            const article = currentArticles.find(a => a.id === id);
            if (article) {
                const weekInput = row.querySelector(".week-input");
                const textarea = row.querySelector(".table-textarea");
                const checkbox = row.querySelector("input[type='checkbox']");

                if (weekInput) article.week = weekInput.value;
                if (textarea) article.note = textarea.value;
                if (checkbox) article.checked = checkbox.checked;
            }
        });
    }

    // Sortera arrayen och rendera om tabellen
    function applySortAndRender() {
        // Uppdatera pilars utseende i rubrikerna
        const articleArrow = sortArticleHeader.querySelector(".sort-arrow");
        const weekArrow = sortWeekHeader.querySelector(".sort-arrow");

        articleArrow.textContent = sortState.articleAsc ? "▼" : "▲";
        weekArrow.textContent = sortState.weekAsc ? "▼" : "▲";

        sortArticleHeader.classList.toggle("active-sort", sortState.column === 'article');
        sortWeekHeader.classList.toggle("active-sort", sortState.column === 'week');

        // Sortera
        currentArticles.sort((a, b) => {
            if (sortState.column === 'article') {
                const nameCmp = a.name.localeCompare(b.name, 'sv');
                if (nameCmp !== 0) {
                    return sortState.articleAsc ? nameCmp : -nameCmp;
                }
                const displayCmp = a.displayText.localeCompare(b.displayText, 'sv');
                return sortState.articleAsc ? displayCmp : -displayCmp;
                
            } else if (sortState.column === 'week') {
                const valA = a.week || "";
                const valB = b.week || "";

                if (valA === valB) {
                    // Sekundär sortering på namn om datum/veckorna är lika
                    return a.displayText.localeCompare(b.displayText, 'sv');
                }

                // Tomma fält hamnar alltid sist
                if (valA === "") return 1;
                if (valB === "") return -1;

                // Använd localeCompare med numeric:true för att hantera datum, korta datum och veckor smart
                if (sortState.weekAsc) {
                    return valA.localeCompare(valB, 'sv', { numeric: true });
                } else {
                    return valB.localeCompare(valA, 'sv', { numeric: true });
                }
            }
        });

        renderTable(currentArticles);
    }

    function renderTable(articles) {
        const tbody = document.querySelector("#resultTable tbody");
        const outputContainer = document.getElementById("outputContainer");
        
        tbody.innerHTML = "";

        articles.forEach(article => {
            const tr = document.createElement("tr");
            tr.dataset.id = article.id;

            // 1. Antal
            const tdAntal = document.createElement("td");
            tdAntal.textContent = `${article.quantity} st`;
            tr.appendChild(tdAntal);

            // 2. Artikel
            const tdArtikel = document.createElement("td");
            tdArtikel.textContent = article.displayText;
            tr.appendChild(tdArtikel);

            // 3. Kopiera art (Button)
            const tdKopiera = document.createElement("td");
            const btnKopiera = document.createElement("button");
            btnKopiera.textContent = "📋";
            btnKopiera.classList.add("btn-copy");

            btnKopiera.addEventListener("click", () => {
                navigator.clipboard.writeText(article.artNr.replace(/\./g, '')).then(() => {
                    const originalText = btnKopiera.textContent;
                    btnKopiera.textContent = "✔";
                    
                    setTimeout(() => {
                        btnKopiera.textContent = originalText;
                    }, 1500);
                });
            });
            tdKopiera.appendChild(btnKopiera);
            tr.appendChild(tdKopiera);

            // 4. Datum/Vecka (Input max 10 tecken för datum)
            const tdVecka = document.createElement("td");
            const inputVecka = document.createElement("input");
            inputVecka.type = "text";
            inputVecka.maxLength = 10;
            inputVecka.placeholder = "Datum/V";
            inputVecka.value = article.week || "";
            inputVecka.classList.add("week-input");

            inputVecka.addEventListener("input", function () {
                // Tillåt siffror och bindestreck, ta bort allt annat
                this.value = this.value.replace(/[^0-9-]/g, "").slice(0, 10);
                article.week = this.value;
            });

            tdVecka.appendChild(inputVecka);
            tr.appendChild(tdVecka);

            // 5. Åter i lager (Auto-expanderande Textarea)
            const tdLager = document.createElement("td");
            const inputLager = document.createElement("textarea");
            inputLager.placeholder = "Kommentar / Status";
            inputLager.rows = 1;
            inputLager.value = article.note || "";
            inputLager.classList.add("table-textarea");

            inputLager.addEventListener("input", function () {
                this.style.height = "auto";
                this.style.height = this.scrollHeight + "px";
                article.note = this.value;
            });

            tdLager.appendChild(inputLager);
            tr.appendChild(tdLager);

            // 6. Kontrollerad (Checkbox)
            const tdKontroll = document.createElement("td");
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked = article.checked || false;

            checkbox.addEventListener("change", function () {
                article.checked = this.checked;
            });

            tdKontroll.appendChild(checkbox);
            tr.appendChild(tdKontroll);

            tbody.appendChild(tr);
        });

        outputContainer.classList.remove("hidden");
    }
});
