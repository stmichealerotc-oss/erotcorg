class TewahdoHaymanot {
    constructor() {
        this.currentContent = null;
        this.cache = new Map(); // Cache loaded teachings
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.createContentContainer();
    }

    async loadTeaching(type, name) {
        const cacheKey = `${type}/${name}`;
        
        // Return cached version if available
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const response = await fetch(`data/${type}/${name}.json`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const teaching = await response.json();
            
            // Cache the loaded teaching
            this.cache.set(cacheKey, teaching);
            return teaching;
        } catch (error) {
            console.error(`Error loading teaching ${cacheKey}:`, error);
            return {
                title: "Content Not Available",
                lead: "Unable to load content",
                sections: [
                    {
                        title: "Error",
                        content: [`Sorry, the content for ${name} could not be loaded at this time.`]
                    }
                ]
            };
        }
    }

    setupEventListeners() {
        // Pillars of Mystery
        document.querySelectorAll('[data-pillar]').forEach(link => {
            link.addEventListener('click', async (e) => {
                e.preventDefault();
                const pillar = e.target.getAttribute('data-pillar');
                await this.showPillarContent(pillar);
                this.hideAllSections();
                this.showTewahdoSection();
                
                // Close dropdown menus after selection
                this.closeDropdownMenus();
            });
        });

        // Sacraments
        document.querySelectorAll('[data-sacrament]').forEach(link => {
            link.addEventListener('click', async (e) => {
                e.preventDefault();
                const sacrament = e.target.getAttribute('data-sacrament');
                await this.showSacramentContent(sacrament);
                this.hideAllSections();
                this.showTewahdoSection();
                
                // Close dropdown menus after selection
                this.closeDropdownMenus();
            });
        });
    }

    closeDropdownMenus() {
        // Close all dropdown menus
        document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
            menu.classList.remove('show');
        });
        document.querySelectorAll('.dropdown-submenu-content.show').forEach(submenu => {
            submenu.classList.remove('show');
        });
        
        // Close mobile nav if open
        const navLinks = document.querySelector('.nav-links');
        if (navLinks && navLinks.classList.contains('active')) {
            navLinks.classList.remove('active');
        }
    }

    hideAllSections() {
        document.querySelectorAll('main section').forEach(section => {
            section.style.display = 'none';
        });
    }

    showTewahdoSection() {
        const tewahdoSection = document.getElementById('tewahdo-haymanot');
        if (tewahdoSection) {
            tewahdoSection.style.display = 'block';
            tewahdoSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    createContentContainer() {
        // Ensure the section exists
        if (!document.getElementById('tewahdo-haymanot')) {
            const main = document.querySelector('main');
            const tewahdoSection = document.createElement('section');
            tewahdoSection.id = 'tewahdo-haymanot';
            tewahdoSection.style.display = 'none';
            tewahdoSection.innerHTML = `
                <div id="tewahdo-content" class="tewahdo-content">
                    <div class="welcome-message">
                        <div class="welcome-icon">✝️</div>
                        <h3>Welcome to Tewahdo Haymanot</h3>
                        <p>Select a topic from the menu to learn about Orthodox faith.</p>
                    </div>
                </div>
            `;
            main.appendChild(tewahdoSection);
        }
    }

    async showPillarContent(pillar) {
        // Show loading state
        this.displayContent('<div class="loading-state"><p>Loading...</p></div>');
        
        // Map pillar names to file names
        const pillarFiles = {
            'trinity': 'the-mystery-of-trinity',
            'incarnation': 'the-mystery-of-incarnation',
            'baptism': 'the-mystery-of-baptism',
            'communion': 'the-mystery-of-communion',
            'resurrection': 'the-mystery-of-resurrection'
        };
        
        const fileName = pillarFiles[pillar];
        if (!fileName) {
            this.displayContent('<p>Content not available.</p>');
            return;
        }
        
        const teaching = await this.loadTeaching('pillars', fileName);
        const content = this.renderTeaching(teaching);
        this.displayContent(content);
    }

    async showSacramentContent(sacrament) {
        // Show loading state
        this.displayContent('<div class="loading-state"><p>Loading...</p></div>');
        
        const teaching = await this.loadTeaching('sacraments', sacrament);
        const content = this.renderTeaching(teaching);
        this.displayContent(content);
    }

    renderTeaching(teaching) {
        let html = `
            <div class="pillar-header">
                <h1>${teaching.title}</h1>
                <p class="lead">${teaching.lead}</p>
            </div>
            <div class="pillar-content">
        `;

        teaching.sections.forEach(section => {
            html += '<div class="pillar-section">';
            
            if (section.title) {
                html += `<h2>${section.title}</h2>`;
            }

            if (section.content) {
                section.content.forEach(paragraph => {
                    html += `<p>${this.formatText(paragraph)}</p>`;
                });
            }

            if (section.list) {
                html += '<ul class="mystery-list">';
                section.list.forEach(item => {
                    html += `<li>${this.formatText(item)}</li>`;
                });
                html += '</ul>';
            }

            if (section.subsections) {
                section.subsections.forEach(subsection => {
                    if (subsection.title) {
                        html += `<h3>${subsection.title}</h3>`;
                    }
                    
                    if (subsection.content) {
                        subsection.content.forEach(paragraph => {
                            html += `<p>${this.formatText(paragraph)}</p>`;
                        });
                    }
                    
                    if (subsection.list) {
                        html += '<ul>';
                        subsection.list.forEach(item => {
                            html += `<li>${this.formatText(item)}</li>`;
                        });
                        html += '</ul>';
                    }
                    
                    if (subsection.content_after) {
                        subsection.content_after.forEach(paragraph => {
                            html += `<p>${this.formatText(paragraph)}</p>`;
                        });
                    }

                    if (subsection.quote) {
                        html += `<div class="bible-references"><p><em>${this.formatText(subsection.quote)}</em></p></div>`;
                    }

                    if (subsection.diagram) {
                        html += this.renderDiagram(subsection.diagram);
                    }
                });
            }

            if (section.content_after) {
                section.content_after.forEach(paragraph => {
                    html += `<p>${this.formatText(paragraph)}</p>`;
                });
            }

            if (section.bible_references) {
                html += '<div class="bible-references">';
                Object.keys(section.bible_references).forEach(category => {
                    html += `<h4>${category}</h4><ul>`;
                    section.bible_references[category].forEach(ref => {
                        html += `<li>${ref}</li>`;
                    });
                    html += '</ul>';
                });
                html += '</div>';
            }

            if (section.quote) {
                html += `<div class="bible-references"><p><em>${this.formatText(section.quote)}</em></p></div>`;
            }

            html += '</div>';
        });

        html += '</div>';
        return html;
    }

    formatText(text) {
        // Convert markdown-style formatting to HTML
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // **bold**
            .replace(/\*(.*?)\*/g, '<em>$1</em>');             // *italic*
    }

    renderDiagram(diagram) {
        if (diagram.type === 'union_diagram') {
            return this.renderUnionDiagram(diagram);
        } else if (diagram.type === 'gateway_flow') {
            return this.renderGatewayFlow(diagram);
        } else if (diagram.type === 'five_pillars') {
            return this.renderFivePillars(diagram);
        } else if (diagram.type === 'water_spirit_union') {
            return this.renderWaterSpiritUnion(diagram);
        } else if (diagram.type === 'triple_immersion') {
            return this.renderTripleImmersion(diagram);
        } else if (diagram.type === 'baptism_chrismation_sequence') {
            return this.renderBaptismChrismationSequence(diagram);
        } else if (diagram.type === 'covenant_comparison') {
            return this.renderCovenantComparison(diagram);
        } else if (diagram.type === 'baptism_hierarchy') {
            return this.renderBaptismHierarchy(diagram);
        } else if (diagram.type === 'old_testament_types') {
            return this.renderOldTestamentTypes(diagram);
        }
        return '';
    }

    renderUnionDiagram(diagram) {
        let html = `<div class="union-diagram-container">`;
        html += `<h4 class="diagram-title">${diagram.title}</h4>`;
        html += `<div class="union-diagram">`;

        // Render the three elements
        diagram.elements.forEach((element, index) => {
            html += `<div class="nature-box ${element.id}" data-color="${element.color}">`;
            html += `<div class="nature-label">${element.label}</div>`;
            html += `<div class="nature-properties">`;
            element.properties.forEach(prop => {
                html += `<div class="property">${prop}</div>`;
            });
            html += `</div></div>`;

            // Add union arrows
            if (index < 2) {
                html += `<div class="union-arrow">⟷</div>`;
            }
        });

        html += `</div>`;
        html += `<div class="diagram-explanation">`;
        html += `<p><strong>Visual Teaching:</strong> The two circles represent the distinct natures, while the overlapping area shows their inseparable union in the one person of Christ.</p>`;
        html += `</div>`;
        html += `</div>`;

        return html;
    }

    renderGatewayFlow(diagram) {
        let html = `<div class="gateway-flow-container">`;
        html += `<h4 class="diagram-title">${diagram.title}</h4>`;
        html += `<div class="gateway-flow">`;

        diagram.steps.forEach((step, index) => {
            html += `<div class="flow-step" data-step="${step.id}">`;
            html += `<div class="step-icon ${step.icon}"></div>`;
            html += `<div class="step-label">${step.label}</div>`;
            html += `<div class="step-description">${step.description}</div>`;
            html += `</div>`;

            if (index < diagram.steps.length - 1) {
                html += `<div class="flow-arrow">↓</div>`;
            }
        });

        html += `</div></div>`;
        return html;
    }

    renderFivePillars(diagram) {
        let html = `<div class="five-pillars-container">`;
        html += `<h4 class="diagram-title">${diagram.title}</h4>`;
        html += `<div class="pillars-structure">`;
        html += `<div class="roof">${diagram.roof}</div>`;
        html += `<div class="pillars-row">`;

        diagram.pillars.forEach(pillar => {
            const highlighted = pillar.highlighted ? 'highlighted' : '';
            html += `<div class="pillar ${highlighted}">`;
            html += `<div class="pillar-top"></div>`;
            html += `<div class="pillar-body">`;
            html += `<div class="pillar-name">${pillar.name}</div>`;
            html += `<div class="pillar-desc">${pillar.description}</div>`;
            html += `</div>`;
            html += `</div>`;
        });

        html += `</div></div></div>`;
        return html;
    }

    renderWaterSpiritUnion(diagram) {
        let html = `<div class="water-spirit-container">`;
        html += `<h4 class="diagram-title">${diagram.title}</h4>`;
        html += `<div class="water-spirit-diagram">`;

        diagram.elements.forEach((element, index) => {
            html += `<div class="element-box ${element.id}" data-color="${element.color}">`;
            html += `<div class="element-label">${element.label}</div>`;
            html += `<div class="element-properties">`;
            element.properties.forEach(prop => {
                html += `<div class="property">${prop}</div>`;
            });
            html += `</div></div>`;

            if (index < 2) {
                html += `<div class="union-symbol">+</div>`;
            }
        });

        html += `</div></div>`;
        return html;
    }

    displayContent(content) {
        const contentDiv = document.getElementById('tewahdo-content');
        if (contentDiv) {
            contentDiv.innerHTML = content;
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    window.tewahdoHaymanot = new TewahdoHaymanot();
});