async function updateStaticRules(enableRulesetIds, disableCandidateIds) {
  let options = { enableRulesetIds: enableRulesetIds, disableRulesetIds: disableCandidateIds };
  const enabledStaticCount = await chrome.declarativeNetRequest.getEnabledRulesets();
  const proposedCount = enableRulesetIds.length;
  if (
    enabledStaticCount + proposedCount >
    chrome.declarativeNetRequest.MAX_NUMBER_OF_ENABLED_STATIC_RULESETS
  ) {
    options.disableRulesetIds = disableCandidateIds;
  }
  await chrome.declarativeNetRequest.updateEnabledRulesets(options);
}

export async function getRulesEnabledState() {
  const enabledRuleSets = await chrome.declarativeNetRequest.getEnabledRulesets();
  return enabledRuleSets.length > 0;
}

function browserReload() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.reload(tabs[0].id, () => {
        resolve();
      });
    });
  });
}

chrome.tabs.onUpdated.addListener(checkWhitelistAndToggleBlocking);
chrome.tabs.onActivated.addListener(function (activeInfo) {
  chrome.tabs.get(activeInfo.tabId, function (tab) {
    checkWhitelistAndToggleBlocking(tab.id, {}, tab);
  });
});

function checkWhitelistAndToggleBlocking(tabId, changeInfo, tab) {
  if (tab.url && tab.url.startsWith('http')) {
    const url = new URL(tab.url);
    const domain = url.hostname;
    chrome.storage.sync.get(['whitelist'], function (result) {
      const whitelist = result.whitelist || [];
      const isWhitelist = whitelist.find((white) => domain.includes(white));
      if (isWhitelist) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs.length > 0) {
            const tabId = tabs[0].id;
            updateStaticRules([], ['default']);
          }
        });
      } else {
        chrome.storage.sync.get('isCheckedToggle', function (result) {
          const isChecked = result.isCheckedToggle;
          if (isChecked) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              if (tabs.length > 0) {
                const tabId = tabs[0].id;
                updateStaticRules(['default'], []);
              }
            });
          }
        });
      }
    });
  }
}

export async function enableRulesForCurrentPage(isChecked) {
  const enableRuleSetIds = ['default'];
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (activeTab) {
    const tabId = activeTab.id;
    await updateStaticRules(enableRuleSetIds, []);
    if (isChecked) {
      await browserReload(tabId);
    }
  }
}

export async function disableRulesForCurrentPage(isChecked) {
  const disableRuleSetIds = ['default'];
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (activeTab) {
    const tabId = activeTab.id;
    await updateStaticRules([], disableRuleSetIds);
    if (isChecked) {
      await browserReload(tabId);
    }
  }
}

chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason === 'install') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: '../assets/images/logo.png',
      title: 'Blocker',
      message: 'Enjoy using your extension!',
      priority: 2,
    });
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.declarativeNetRequest.setExtensionActionOptions({ displayActionCountAsBadgeText: true });
});
