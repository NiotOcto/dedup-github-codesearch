// Deduplicate a page of GitHub Code Search results.

function dedupSearchResults() {
    // CSS selectors to locate elements in a GitHub Code Search results page.
    // Container for one search result:
    const snippetSel = "div.code-list-item";
    // The two links above each snippet:
    const repoLinkSel = "div.flex-shrink-0";
    const fileLinkSel = ".f4";
    // The lines of the snippet text:
    // Unlike class blob-code, blob-code-inner excludes ellipsis lines
    const snippetLineSel = "td.blob-code-inner";

    function Cluster(position) {
        this.resultDiv = position;
        this.dupeLinks = [];
    }

    const results = document.querySelectorAll(snippetSel);
    let snippetToCluster = new Map();

    function snippetLinks(elem) {
        let repoLink = elem.querySelector(repoLinkSel).cloneNode(true);
        let fileLink = elem.querySelector(fileLinkSel).cloneNode(true);
        return [repoLink, fileLink];
    }

    function linesToSnippet(lines) {
        const textLines = [];
        for (const line of lines) {
            textLines.push(line.textContent);
        }
        return textLines.join("\n");
    }

    function getDOMRange(elem) {
        const range = document.createRange();
        range.selectNode(elem);
        return range;
    }

    // Delete repeated snippets. Or save the resultDiv of the original snippet.
    for (const resultDiv of results) {
        const lines = resultDiv.querySelectorAll(snippetLineSel);
        const snippet = linesToSnippet(lines);
        if (snippetToCluster.has(snippet)) {
            snippetToCluster.get(snippet).dupeLinks.push(...snippetLinks(resultDiv));
            getDOMRange(resultDiv).deleteContents();
        } else {
            snippetToCluster.set(snippet, new Cluster(resultDiv));
        }
    }
    // Move deleted links above the original snippet.
    for (const cluster of snippetToCluster.values()) {
        for (const link of cluster.dupeLinks) {
            cluster.resultDiv.querySelector(fileLinkSel).insertAdjacentElement('beforeend', link);
        }
    }
}

// Register the DOM post-processing code.
// onUpdated happens after initial code results and also after 'Next Page' and 'Back Button'.
chrome.tabs.onUpdated.addListener(function (tabId, changedProps, tab) {
    if (!(tab.url && tab.url.startsWith("https://github.com/"))) {
        return; // avoid permission errors on "chrome:" URLs
    }
    chrome.scripting.executeScript({
        target: {tabId: tab.id},
        function: dedupSearchResults
    }).then();
});
