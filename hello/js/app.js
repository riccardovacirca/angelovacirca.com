
// Configurazione avanzata di Marked
marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: true,
    highlight: function(code, lang) {
        const validLang = Prism.languages[lang] ? lang : 'markup';
        return Prism.highlight(code, Prism.languages[validLang], validLang);
    }
});

// Funzione migliorata per il parsing del front matter
function parseMarkdownWithFrontMatter(content) {
    const frontMatterRegex = /^---\s*\n([\s\S]+?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontMatterRegex);

    if (!match) {
        return {
            metadata: {},
            content: marked.parse(content)
        };
    }

    const yaml = match[1];
    const markdownContent = match[2];
    
    try {
        const metadata = {};
        yaml.split('\n').forEach(line => {
            if (line.trim() === '') return;
            
            const colonPos = line.indexOf(':');
            if (colonPos === -1) return;
            
            const key = line.substring(0, colonPos).trim();
            let value = line.substring(colonPos + 1).trim();
            
            // Gestione valori tra virgolette
            if ((value.startsWith('"') && value.endsWith('"'))) {
                value = value.slice(1, -1);
            }
            
            // INIZIO MODIFICA - Gestione specifica dei campi
            if (key === 'tags') {
                // Parsing array tags
                value = value.startsWith('[') ? 
                    value.slice(1, -1).split(',').map(t => t.trim().replace(/"/g, '')) : 
                    [value];
            }
            else if (key === 'subtitle') {  // <-- QUI INSERISCI IL CODICE!
                metadata.subtitle = value;
            }
            else {
                metadata[key] = value;  // Campi generici
            }
            // FINE MODIFICA
        });

        return {
            metadata,
            content: marked.parse(markdownContent)
        };
    } catch (error) {
        console.error("Errore nel parsing del front matter:", error);
        return {
            metadata: {},
            content: marked.parse(content)
        };
    }
}

// Funzione per caricare i post
async function loadPosts() {
    try {
        const indexResponse = await fetch('./posts/index.json');
        if (!indexResponse.ok) throw new Error('Failed to load post index');
        
        const { posts } = await indexResponse.json();
        
        const postPromises = posts.map(async post => {
            const response = await fetch(`./posts/${post.file}`);
            if (!response.ok) throw new Error(`Failed to load ${post.file}`);
            
            const content = await response.text();
            const { metadata, content: htmlContent } = parseMarkdownWithFrontMatter(content);
            
            // MODIFICA QUI: Unisci i metadati in modo intelligente
            return {
                title: post.title || metadata.title,
                subtitle: post.subtitle || metadata.subtitle, // <-- Assicurati che il subtitle sia incluso
                date: post.date || metadata.date,
                author: post.author || metadata.author,
                tags: post.tags || metadata.tags,
                excerpt: post.excerpt || metadata.excerpt,
                content: htmlContent,
                slug: post.slug || metadata.slug || post.file.replace('.md', '')
            };
        });

        return await Promise.all(postPromises);
    } catch (error) {
        console.error("Error loading posts:", error);
        return [];
    }
}
// Funzione di rendering
function renderPosts(posts) {
    const container = document.getElementById('blog-content');
    container.innerHTML = posts.map(post => `
        <article class="post-card card mb-4" data-slug="${post.slug}">
            <div class="card-body">
                <h2 class="post-title typewriter">${post.title}</h2>
                
                ${post.subtitle ? `
                    <h3 class="post-subtitle typewriter text-muted fs-4 mb-3">
                        ${post.subtitle}
                    </h3>
                ` : ''}
                
                <div class="post-meta mb-3">
                    <!-- resto del meta... -->
                </div>
                
                <div class="post-content">${post.content}</div>
            </div>
        </article>
    `).join('');
}


// Inizializzazione
document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('current-year').textContent = new Date().getFullYear();
    
    const posts = await loadPosts();
    renderPosts(posts.sort((a, b) => new Date(b.date) - new Date(a.date)));
    
    // Aggiungi qui eventuali gestori di eventi
});