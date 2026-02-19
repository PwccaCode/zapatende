/**
    SCRIPT BY FERRAMENTAS MARKETING
*/

// -----------------------  FMARK SCRIPT WHATSAPP DEFAULT ------------------------------ //

// ================== HELPERS ==================
function getAllGroupContacts(Contacts) {
  SetConsoleMessage("GetAllGroupContacts", JSON.stringify(Contacts));
}

function localStorageGetItem(item) {
  if (!window.localStorage) {
    return null;
  }
  let aJson = localStorage.getItem(item);
  if (!aJson) {
    SetConsoleMessage("getMyNumber", '""');
    return null;
  }
  SetConsoleMessage("getMyNumber", aJson.replace(/(?=:)(.*.?)(?=@)/g, ""));
  return aJson;
}

function localStorageGetItemID(item) {
  if (!window.localStorage) {
    return null;
  }
  let aNumberID = localStorage.getItem(item);
  if (!aNumberID) {
    return null;
  }
  return aNumberID;
}

function getMyNumber() {
  localStorage.getItem("last-wid-md") ? localStorageGetItem("last-wid-md") : localStorageGetItem("last-wid");

  return true;
}

function getMyNumberID() {
  let numberID = localStorage.getItem("last-wid-md")
    ? localStorageGetItemID("last-wid-md")
    : localStorageGetItemID("last-wid");

  return numberID;
}

function convertImgToBase64URL(url, callback, outputFormat) {
  var img = new Image();
  img.crossOrigin = "Anonymous";
  img.onload = function () {
    var canvas = document.createElement("CANVAS"),
      ctx = canvas.getContext("2d"),
      dataURL;
    canvas.height = img.height;
    canvas.width = img.width;
    ctx.drawImage(img, 0, 0);
    dataURL = canvas.toDataURL(outputFormat);
    callback(dataURL);
    canvas = null;
  };
  img.src = url;
}

function SetConsoleMessage(jsName, resultValue) {
  Obj = {
    name: jsName,
    result: '{"result":' + resultValue + "}",
  };
  console.log(JSON.stringify(Obj));
}

var intervalMonitor;
var isLoggedStatus = false;
var gettingUnreadMessages = false;

function startMonitor(intervalSeconds = 0) {
  isLoggedStatus = FMARK.isLoggedIn();

  if (intervalSeconds >= 1) {
    intervalMonitor = window.setInterval(monitorUnReadMessages, intervalSeconds * 1000);
  }
}

function stopMonitor() {
  window.clearInterval(intervalMonitor);
}

function removeElementsByClass(elementClass) {
  var elements = document.getElementsByClassName(elementClass);
  if (typeof elements !== "undefined" && elements.length > 0) {
    for (var i = 0; i < elements.length; i++) {
      elements[i].parentNode.removeChild(elements[i]);
    }
  }
}

function moveElementsToParentParentElement(elementClass) {
  var elements = document.getElementsByClassName(elementClass);
  if (typeof elements !== "undefined" && elements.length > 0) {
    for (var i = 0; i < elements.length; i++) {
      var element = elements[i];
      element.parentNode.parentNode.appendChild(element);
    }
  }
}

function monitorUnReadMessages() {
  if (gettingUnreadMessages) return;

  gettingUnreadMessages = true;

  var currentStatus = FMARK.isLoggedIn();
  if (currentStatus != isLoggedStatus) {
    isLoggedStatus = FMARK.isLoggedIn();
    SetConsoleMessage("OnChangeConnect", JSON.stringify(isLoggedStatus));
  }

  if (isLoggedStatus) {
    FMARK.getUnreadMessages((includeMe = "true"), (includeNotifications = "true"), (use_unread_count = "true"));
  }
  gettingUnreadMessages = false;
}

// ================== MODULE NAME NORMALIZATION ==================
/**
 * Normaliza nomes de módulos do WhatsApp Web.
 * Aceita nomes com/sem prefixos "WAWeb" e/ou "use", e gera uma lista de candidatos
 * em ordem de prioridade (para você poder usar "ContactCollection" ao invés de "WAWebContactCollection").
 *
 * @param {string} loadName
 * @returns {string[]}
 */
function fmarkGetModuleIdCandidates(loadName) {
  if (typeof loadName !== "string") return [];
  const raw = loadName.trim();
  if (!raw) return [];

  /** @type {Set<string>} */
  const set = new Set();

  /** @param {string} v */
  const add = (v) => {
    if (typeof v !== "string") return;
    const s = v.trim();
    if (s) set.add(s);
  };

  // 0) Nome como veio
  add(raw);

  // 1) Base sem "use"
  const withoutUse = raw.startsWith("use") ? raw.slice(3) : raw;

  // 2) Base sem "WAWeb"
  const base = withoutUse.startsWith("WAWeb") ? withoutUse.slice(5) : withoutUse;

  // 3) Combinações comuns
  add(base);                 // Ex.: ContactCollection
  add("WAWeb" + base);       // Ex.: WAWebContactCollection
  add("use" + base);         // Ex.: useContactCollection
  add("useWAWeb" + base);    // Ex.: useWAWebContactCollection

  return Array.from(set);
}

/**
 * Tenta carregar um módulo usando uma lista de candidatos gerada por fmarkGetModuleIdCandidates.
 *
 * @param {(id:string)=>any} webpackRequire
 * @param {string} loadName
 * @returns {{ module: any, moduleName: string } | null}
 */
function fmarkRequireByCandidates(webpackRequire, loadName) {
  const candidates = fmarkGetModuleIdCandidates(loadName);
  for (const candidate of candidates) {
    const mod = webpackRequire(candidate);
    if (mod) return { module: mod, moduleName: candidate };
  }
  return null;
}


// ================== STORE BOOTSTRAP ==================
var version = parseFloat(Debug.VERSION);

if (!window.Store && version >= 2.3) {
  (function () {
    if (window.Store) return; // já injetado

    const global = self || window;

    // Versão simplificada do __debug deles
    const __debug = () => {
      if (!global.require) return null;
      try {
        return global.require("__debug");
      } catch (e) {
        return null;
      }
    };

    // Cria um "webpackRequire" no padrão novo do WhatsApp (meta loader)
    function createWebpackRequire() {
      const dbg = __debug();
      if (!dbg || !dbg.modulesMap) return null;

      const webpackRequire = function (id) {
        try {
          if (global.ErrorGuard && global.ErrorGuard.skipGuardGlobal) {
            global.ErrorGuard.skipGuardGlobal(true);
          }
          return global.importNamespace(id);
        } catch (error) {
          return null;
        }
      };

      Object.defineProperty(webpackRequire, "m", {
        get() {
          const modulesMap = __debug().modulesMap;
          if (!modulesMap) return {};

          const ids = Object.keys(modulesMap).filter(
            (id) =>
              /^(?:use)?WA/.test(id) &&
              // Mesmo filtro de bug do WPPConnect:
              id !== "WAWebEmojiPanelContentEmojiSearchEmpty.react" &&
              id !== "WAWebMoment-es-do",
          );

          const result = {};
          for (const id of ids) {
            result[id] = modulesMap[id]?.factory;
          }
          return result;
        },
      });

      return webpackRequire;
    }

    const webpackRequire = createWebpackRequire();
    if (!webpackRequire) {
      // Se quiser, aqui você pode colocar um setInterval para tentar de novo
      return;
    }

    // ================== A PARTIR DAQUI É O "STORE" ==================

    /**
     * Cada item:
     *  - id: nome que vai para window.Store[id]
     *  - load?: nome WAWeb* fixo (quando você já sabe qual é)
     *  - resolve(module): recebe o módulo bruto e retorna o que deve ser guardado em Store[id] (ou null)
     */
    const neededObjects = [
      {
        id: "Store",
        resolve: (m) => (m && m.default ? m.default : null),
      },
      {
        id: "Conn",
        resolve: (m) => (m && m.default && m.default.ref && m.default.refTTL ? m.default : m && m.Conn ? m.Conn : null),
      },
      {
        id: "MediaCollection",
        load: "WAWebAttachMediaCollection",
        resolve: (m) => (m && m.default ? m.default : null),
      },
      {
        id: "MediaProcess",
        resolve: (m) => (m && m.BLOB ? m : null),
      },
      {
        id: "GroupSettings",
        resolve: (m) => (m && m.sendSetGroupProperty ? m : null),
      },
      {
        id: "Archive",
        resolve: (m) => (m && m.setArchive ? m : null),
      },
      {
        id: "Block",
        resolve: (m) => (m && m.blockContact && m.unblockContact ? m : null),
      },
      {
        id: "ChatUtil",
        resolve: (m) => (m && m.sendClear ? m : null),
      },
      {
        id: "GroupInvite",
        resolve: (m) => (m && m.sendQueryGroupInviteCode ? m : null),
      },
      {
        id: "Wap",
        resolve: (m) => (m && m.createGroup ? m : null),
      },
      {
        id: "sendCreateGroup",
        resolve: (m) => (m && m.sendCreateGroup ? m.sendCreateGroup : null),
      },
      {
        id: "State",
        resolve: (m) => (m && m.STATE && m.STREAM ? m : null),
      },
      {
        id: "_Presence",
        resolve: (m) => (m && m.setPresenceAvailable && m.setPresenceUnavailable ? m : null),
      },
      {
        id: "WapDelete",
        resolve: (m) => (m && m.sendConversationDelete && m.sendConversationDelete.length === 2 ? m : null),
      },
      {
        id: "Profile",
        resolve: (m) => (m && m.sendSetPicture && m.requestDeletePicture ? m : null),
      },
      {
        id: "FindChat",
        resolve: (m) => (m && m.findOrCreateLatestChat ? m : null),
      },
      {
        id: "GroupDesc",
        resolve: (m) => (m && m.TrustedGroupDesc ? m : null),
      },
      {
        id: "WapQuery",
        resolve: (m) => (m && m.default && m.default.queryExists ? m.default : null),
      },
      {
        id: "Perfil",
        resolve: (m) => (m && m.__esModule === true && m.setPushname && !m.getComposeContents ? m : null),
      },
      {
        id: "sendDemoteParticipants",
        resolve: (m) => (m && m.sendDemoteParticipants ? m.sendDemoteParticipants : null),
      },
      {
        id: "CryptoLib",
        resolve: (m) => (m && m.decryptE2EMedia ? m : null),
      },
      {
        id: "OpenChat",
        resolve: (m) => (m && m.default && m.default.prototype && m.default.prototype.openChat ? m.default : null),
      },
      {
        id: "GroupTitle",
        resolve: (m) => (m && m.sendSetGroupSubject ? m : null),
      },
      {
        id: "GroupColorParticipant",
        resolve: (m) => (m && m.setGroupParticipantAssignedColor ? m : null),
      },
      {
        id: "UserConstructor",
        resolve: (m) =>
          m && m.default && m.default.prototype && m.default.prototype.isServer && m.default.prototype.isUser
            ? m.default
            : null,
      },
      {
        id: "sendAddParticipants",
        resolve: (m) => (m && m.sendAddParticipants ? m.sendAddParticipants : null),
      },
      {
        id: "SendTextMsgToChat",
        resolve: (m) => (m && m.sendTextMsgToChat ? m.sendTextMsgToChat : null),
      },
      {
        id: "ReadSeen",
        resolve: (m) => (m && m.sendSeen ? m : null),
      },
      {
        id: "sendDelete",
        resolve: (m) => (m && m.sendDelete ? m.sendDelete : null),
      },
      {
        id: "sendPromoteParticipants",
        resolve: (m) => (m && m.sendPromoteParticipants ? m.sendPromoteParticipants : null),
      },
      {
        id: "addAndSendMsgToChat",
        resolve: (m) => (m && m.addAndSendMsgToChat ? m.addAndSendMsgToChat : null),
      },
      {
        id: "PrepareMessageSendingAction",
        load: "WAWebPrepareMessageSendingAction",
        resolve: (m) => (m && m.prepareChatForMessageSending ? m : null),
      },
      {
        id: "PollsSendPollCreationMsgAction",
        load: "WAWebPollsSendPollCreationMsgAction",
        resolve: (m) => (m && typeof m.sendPollCreation === "function" ? m : null),
      },
      {
        id: "sendMsgToChat",
        resolve: (m) => (m && m.sendMsgToChat ? m.sendMsgToChat : null),
      },
      {
        id: "Catalog",
        resolve: (m) => (m && m.Catalog ? m.Catalog : null),
      },
      {
        id: "bp",
        resolve: (m) =>
          m && m.default && m.default.toString && m.default.toString().includes("bp_unknown_version")
            ? m.default
            : null,
      },
      {
        id: "MsgKey",
        resolve: (m) =>
          m && m.default && m.default.toString && m.default.toString().includes("MsgKey error: obj is null/undefined")
            ? m.default
            : null,
      },
      {
        id: "Parser",
        // CORRIGIDO: testa em default e devolve default
        resolve: (m) => (m && m.default && m.default.convertToTextWithoutSpecialEmojis ? m.default : null),
      },
      {
        id: "Builders",
        resolve: (m) => (m && m.TemplateMessage && m.HydratedFourRowTemplate ? m : null),
      },
      {
        id: "Me",
        resolve: (m) => (m && m.PLATFORMS && m.Conn && m.default ? m.default : null),
      },
      {
        id: "CallUtils",
        resolve: (m) => (m && m.sendCallEnd && m.parseCall ? m : null),
      },
      {
        id: "Identity",
        resolve: (m) => (m && m.queryIdentity && m.updateIdentity ? m : null),
      },
      {
        id: "MyStatus",
        resolve: (m) => (m && m.getStatus && m.setMyStatus ? m : null),
      },
      {
        id: "ChatStates",
        resolve: (m) => (m && m.sendChatStatePaused && m.sendChatStateRecording && m.sendChatStateComposing ? m : null),
      },
      {
        id: "GroupActions",
        load: "WAWebExitGroupAction",
        resolve: (m) => (m ? m : null),
      },
      {
        id: "Features",
        resolve: (m) => (m && m.FEATURE_CHANGE_EVENT && m.features ? m : null),
      },
      {
        id: "MessageUtils",
        resolve: (m) => (m && m.storeMessages && m.appendMessage ? m : null),
      },
      {
        id: "WebMessageInfo",
        resolve: (m) => (m && m.WebMessageInfo && m.WebFeatures ? m.WebMessageInfo : null),
      },
      {
        id: "createMessageKey",
        resolve: (m) => (m && m.createMessageKey && m.createDeviceSentMessage ? m.createMessageKey : null),
      },
      {
        id: "Participants",
        resolve: (m) =>
          m && m.addParticipants && m.removeParticipants && m.promoteParticipants && m.demoteParticipants ? m : null,
      },
      {
        id: "WidFactory",
        resolve: (m) => (m && m.isWidlike && m.createWid && m.createWidFromWidLike ? m : null),
      },
      {
        id: "Base",
        resolve: (m) => (m && m.setSubProtocol && m.binSend && m.actionNode ? m : null),
      },
      {
        id: "Versions",
        resolve: (m) =>
          m && m.loadProtoVersions && m.default && m.default["15"] && m.default["16"] && m.default["17"] ? m : null,
      },
      {
        id: "Sticker",
        resolve: (m) => (m && m.default && m.default.Sticker ? m.default.Sticker : null),
      },
      {
        id: "checkNumberBeta",
        resolve: (m) => (m && (m.queryExist || m.queryPhoneExists) ? m : null),
      },
      {
        id: "checkNumberOptions",
        resolve: (m) =>
          m && ((m.queryExists && m.queryPhoneExists) || (m.queryWidExists && m.queryPhoneExists)) ? m : null,
      },
      {
        id: "MediaUpload",
        resolve: (m) => (m && m.default && m.default.mediaUpload ? m.default : null),
      },
      {
        id: "UploadUtils",
        resolve: (m) => (m && m.default && m.default.encryptAndUpload ? m.default : null),
      },
      {
        id: "UserPrefs",
        load: "WAWebUserPrefsMeUser",
        resolve: (m) => (m ? m : null),
      },
      {
        id: "Vcard",
        resolve: (m) => (m && m.vcardFromContactModel ? m : null),
      },
      {
        id: "sendRemoveParticipants",
        resolve: (m) => (m && m.sendRemoveParticipants ? m.sendRemoveParticipants : null),
      },
      {
        id: "tagsLabels",
        resolve: (m) => (m && m.LabelCollection ? m.LabelCollection : null),
      },
      {
        id: "randomMessageId",
        resolve: (m) => (m && m.default && m.default.newId ? m.default : null),
      },
      {
        id: "getMsgKeyNewId",
        load: "WAWebMsgKeyNewId",
        resolve: (m) => (m && m.getMsgKeyNewSHA256Id ? m.getMsgKeyNewSHA256Id : null),
      },
      {
        id: "EphemeralFields",
        resolve: (m) => (m && m.getEphemeralFields ? m : null),
      },
      {
        id: "findFirstWebLink",
        resolve: (m) => (m && m.findFirstWebLink ? m.findFirstWebLink : null),
      },
      {
        id: "queryLinkPreview",
        resolve: (m) => (m && m.genMinimalLinkPreview ? m.genMinimalLinkPreview : null),
      },
      {
        id: "GroupMutationParticipantUtils",
        load: "WAWebGroupMutationParticipantUtils",
        resolve: (m) => (m && m.getGroupMutationParticipant ? m : null),
      },
      {
        id: "createGroup",
        load: "WAWebGroupCreateJob",
        resolve: (m) => (m && m.createGroup ? m.createGroup : null),
      },
      {
        id: "setGroupOptions",
        resolve: (m) => (m && m.setGroupSubject && m.setGroupDescription && m.setGroupProperty ? m : null),
      },
      {
        id: "setGroupParticipantOptions",
        resolve: (m) =>
          m &&
          m.addGroupParticipants &&
          m.removeGroupParticipants &&
          m.promoteGroupParticipants &&
          m.demoteGroupParticipants
            ? m
            : null,
      },
      {
        id: "sendSetGroupProperty",
        resolve: (m) =>
          m &&
          ((m.sendSetGroupSubject && m.sendSetGroupDescription && m.sendSetGroupProperty) ||
            (m.setGroupSubject && m.setGroupDescription && m.setGroupProperty))
            ? m
            : null,
      },
      {
        id: "OptionsParticipants",
        resolve: (m) =>
          m &&
          m.addParticipants &&
          m.removeParticipants &&
          m.promoteCommunityParticipants &&
          m.promoteParticipants &&
          m.demoteCommunityParticipants &&
          m.demoteParticipants &&
          !m.updateParticipants
            ? m
            : null,
      },
      {
        id: "registerLinkOption",
        resolve: (m) => (m && m.fetchPlaintextLinkPreviewAction ? m : null),
      },
      {
        id: "MediaPrep",
        // **APENAS UMA VEZ** (removi a duplicata)
        resolve: (m) => (m && m.uploadProductImage && m.MediaPrep ? m : null),
      },
      {
        id: "OpaqueData",
        resolve: (m) => (m && m.default && m.default.createFromData ? m.default : null),
      },
      {
        id: "getUploadOptions",
        resolve: (m) => (m && m.getUploadLimit ? m : null),
      },
      {
        id: "getMediaOptions",
        resolve: (m) => (m && m.createFile ? m : null),
      },
      {
        id: "getMediaEditor",
        resolve: (m) => (m && m.MediaEditorAction ? m : null),
      },
      {
        id: "optionsCheckNumberQuery",
        resolve: (m) => (m && m.USyncQuery ? m : null),
      },
      {
        id: "optionsCheckNumberUser",
        resolve: (m) => (m && m.USyncUser ? m : null),
      },
      {
        id: "optionsMedia",
        resolve: (m) => (m && m.sendMediaMsgToChat ? m : null),
      },
      {
        id: "ContactOptions",
        load: "WAWebContactGetters",
        resolve: (m) => (m ? m : null),
      },
      {
        id: "saveContactAction",
        load: "WAWebSaveContactAction",
        resolve: (m) => (m && m.saveContactAction ? m.saveContactAction : null),
      },
      {
        id: "saveContactActionV2",
        load: "WAWebSaveContactAction",
        resolve: (m) => (m && m.saveContactAction ? m.saveContactAction : null),
      },
      {
        id: "GroupMetadata",
        load: "WAWebGroupMetadataCollection",
        resolve: (m) => (m && m.default ? m.default : null),
      },
      {
        id: "Cmd",
        load: "WAWebCmd",
        resolve: (m) => (m && m.Cmd ? m.Cmd : null),
      },
      {
        id: "Chat",
        resolve: (m) => (m && m.ChatCollection ? m.ChatCollection : null),
      },
      {
        id: "Contact",
        resolve: (m) => (m && m.ContactCollection ? m.ContactCollection : null),
      },
      {
        id: "ProfilePicThumb",
        resolve: (m) => (m && m.ProfilePicThumbCollection ? m.ProfilePicThumbCollection : null),
      },
      {
        id: "Msg",
        load: "WAWebMsgCollection",
        resolve: (m) => (m && m.MsgCollection ? m.MsgCollection : null),
      },
      {
        id: "GetPreviewLinkAction",
        load: "WAWebLinkPreviewChatAction",
        resolve: (m) => (m ? m : null),
      },
      {
        id: "BotProfileCollection",
        resolve: (m) => (m && m.BotProfileCollection ? m.BotProfileCollection : null),
      },
      {
        id: "genBotMsgSecretFromMsgSecret",
        load: "WAWebBotMessageSecret",
        resolve: (m) => (m && m.genBotMsgSecretFromMsgSecret ? m.genBotMsgSecretFromMsgSecret : null),
      },
      {
        id: "GroupInviteAction",
        load: "WAWebGroupInviteAction",
        resolve: (m) => (m ? m : null),
      },
      {
        id: "DownloadManager",
        load: "WAWebDownloadManager",
        resolve: (m) => (m ? m : null),
      },
      {
        id: "MmsMediaTypes",
        load: "WAWebMmsMediaTypes",
        resolve: (m) => (m ? m : null),
      },
      {
        id: "WAWebMedia",
        load: "WAWebMedia",
        resolve: (m) => (m ? m : null),
      },
      {
        id: "ApiContact",
        load: "WAWebApiContact",
        resolve: (m) => (m ? m : null),
      },
      {
        id: "ContactSyncApi",
        load: "WAWebContactSyncApi",
        resolve: (m) => (m ? m : null),
      },
      {
        id: "msgFindQuery",
        resolve: (m) => (m && m.msgFindQuery && m.queryMessageType ? m.msgFindQuery : null),
      },
      {
        id: "ChatPresence",
        resolve: (m) => (m && m.markComposing ? m : null),
      },
      {
        id: "ColorLabelIndexToHex",
        resolve: (m) => (m && m.colorIndexToHex ? m : null),
      },
      {
        id: "toUserLid",
        resolve: (m) => (m && m.toUserLid ? m.toUserLid : null),
      },
      {
        id: "LidMigrationUtils",
        load: "WAWebLidMigrationUtils",
        resolve: (m) => (m && m.toUserLid ? m : null),
      },
      {
        id: "Lid1X1MigrationGating",
        load: "WAWebLid1X1MigrationGating",
        resolve: (m) => (m && m.Lid1X1MigrationUtils ? m : null),
      },
      {
        id: "MessageProcessUtils",
        load: "WAWebMessageProcessUtils",
        resolve: (m) => (m && m.selectChatForOneOnOneMessage ? m : null),
      },
      {
        id: "SyncContactJob",
        load: "WAWebSyncContactJob",
        resolve: (m) => (m && m.syncContactListJob ? m : null),
      },
      {
        id: "WebGroupType",
        load: "WAWebGroupType",
        resolve: (m) => (m ? m : null),
      },
      {
        id: "WebGroupParticipantsJob",
        load: "WAWebGroupParticipantsJob",
        resolve: (m) => (m ? m : null),
      },
      {
        id: "WeblidPnCache",
        resolve: (m) => (m ? m.lidPnCache : null),
      },
      {
        id: "PollCreationUtils",
        load: "WAWebPollCreationUtils",
        resolve: (m) => (m && (m.PollContentType || m.PollType) ? m : null),
      },
      {
        id: "PollVoteCollection",
        resolve: (m) => (m && m.PollVoteCollection ? m.PollVoteCollection : null),
      },
      {
        id: "createPollVoteModel",
        resolve: (m) => (m && m.createPollVoteModel && typeof m.createPollVoteModel === "function" ? m.createPollVoteModel : null),
      },
      // ==================== CALL MODULES (baseado no WPP/wa-js) ====================
      {
        id: "websocket",
        resolve: (m) => {
          // Objeto websocket completo com smax, sendSmaxStanza, ensureE2ESessions, generateId
          if (m && m.smax && m.sendSmaxStanza) return m;
          return null;
        },
      },
      {
        id: "smax",
        load: "WASmaxJsx",
        resolve: (m) => (m && m.smax ? m.smax : null),
      },
      {
        id: "sendSmaxStanza",
        load: "WAComms",
        resolve: (m) => (m && m.sendSmaxStanza ? m.sendSmaxStanza : null),
      },
      {
        id: "generateId",
        load: "WAWap",
        resolve: (m) => (m && m.generateId ? m.generateId : null),
      },
      {
        id: "ensureE2ESessions",
        resolve: (m) => (m && m.ensureE2ESessions ? m.ensureE2ESessions : null),
      },
      {
        id: "CallStore",
        load: "WAWebCallCollection",
        resolve: (m) => {
          if (m && m.CallCollectionImpl) return m.CallCollectionImpl;
          if (m && m.default && m.default.processIncomingCall) return m.default;
          if (m && m.CallCollection) return m.CallCollection;
          return null;
        },
      },
      {
        id: "CallModel",
        load: "WAWebCallModel",
        resolve: (m) => {
          if (m && m.CallModel) return m.CallModel;
          if (m && m.default && m.default.prototype && m.default.prototype.getState) return m.default;
          return null;
        },
      },
      {
        id: "CALL_STATES",
        load: "WAWebVoipWaCallEnums",
        resolve: (m) => (m && m.CallState ? m.CallState : null),
      },
      {
        id: "randomHex",
        load: "WARandomHex",
        resolve: (m) => (m && m.randomHex ? m.randomHex : null),
      },
      {
        id: "getFanOutList",
        resolve: (m) => (m && m.getFanOutList ? m.getFanOutList : null),
      },
      {
        id: "encryptMsgProtobuf",
        resolve: (m) => (m && m.encryptMsgProtobuf ? m.encryptMsgProtobuf : null),
      },
      {
        id: "unixTime",
        resolve: (m) => {
          if (m && m.unixTime) return m.unixTime;
          if (m && m.Clock && m.Clock.globalUnixTime) return m.Clock.globalUnixTime.bind(m.Clock);
          return null;
        },
      },
      {
        id: "adv",
        resolve: (m) => (m && m.getADVSecretKey && m.setADVSignedIdentity ? m : null),
      },
      {
        id: "VoipStartCall",
        load: "WAWebVoipStartCall",
        resolve: (m) => (m && (typeof m.startWAWebVoipCall === "function" || typeof m.joinOngoingWAWebVoipGroupCallPN === "function" || typeof m.startCall === "function") ? m : null),
      },
      // ==================== PIN MESSAGE MODULES ====================
      {
        id: "PinInChatStore",
        resolve: (m) => {
          if (m && m.PinInChatCollectionImpl) return m.PinInChatCollectionImpl;
          if (m && m.PinInChatCollection) return m.PinInChatCollection;
          if (m && m.getByParentMsgKey) return m;
          return null;
        },
      },
      {
        id: "sendPinInChatMsg",
        resolve: (m) => (m && m.sendPinInChatMsg ? m.sendPinInChatMsg : null),
      },
      {
        id: "PIN_STATE",
        resolve: (m) => (m && m.PIN_STATE ? m.PIN_STATE : null),
      },
      {
        id: "ACK",
        resolve: (m) => (m && m.ACK ? m.ACK : null),
      },
      {
        id: "MSG_TYPE",
        resolve: (m) => (m && m.MSG_TYPE ? m.MSG_TYPE : null),
      },
      // ==================== AUTH MODULES ====================
      {
        id: "isAuthenticatedFn",
        resolve: (m) => {
          if (m && m.isLoggedIn && typeof m.isLoggedIn === "function") return m.isLoggedIn;
          if (m && m.Z && m.Z.toString && m.Z.toString().includes("isRegistered")) return m.Z;
          return null;
        },
      },
      // ==================== VOIP / CALL MODULES ====================
      {
        id: "VoipBackendLoadable",
        load: "WAWebVoipBackendLoadable",
        resolve: (m) => (m && typeof m.requireVoipJsBackend === "function" ? m : null),
      },
      {
        id: "CallCollection",
        load: "WAWebCallCollection",
        resolve: (m) => {
          if (m && m.default && typeof m.default.processIncomingCall === "function") return m.default;
          if (m && m.default && typeof m.default.setActiveCall === "function") return m.default;
          if (m && typeof m.processIncomingCall === "function") return m;
          if (m && typeof m.setActiveCall === "function") return m;
          if (m && m.CallCollectionImpl) return m.CallCollectionImpl;
          return null;
        },
      },
      {
        id: "VoipWaCallEnums",
        load: "WAWebVoipWaCallEnums",
        resolve: (m) => {
          if (m && m.CallState) return m;
          if (m && m.default && m.default.CallState) return m.default;
          return null;
        },
      },
      {
        id: "VoipGatingUtils",
        load: "WAWebVoipGatingUtils",
        resolve: (m) => (m && typeof m.isCallingEnabled === "function" ? m : null),
      },
      {
        id: "VoipStartCall",
        load: "WAWebVoipStartCall",
        resolve: (m) => {
          if (m && typeof m.startWAWebVoipCall === "function") return m;
          if (m && typeof m.startCall === "function") return m;
          if (m && typeof m.default === "function") return m;
          if (m && m.default && typeof m.default.startWAWebVoipCall === "function") return m.default;
          if (m && m.default && typeof m.default.startCall === "function") return m.default;
          if (m && typeof m.joinOngoingWAWebVoipGroupCallPN === "function") return m;
          return null;
        },
      },
      {
        id: "CallModel",
        load: "WAWebCallModel",
        resolve: (m) => (m && m.default && m.default.prototype ? m.default : null),
      },
    ];

    const moduleIds = Object.keys(webpackRequire.m);
    const Store = (window.Store = window.Store || {});

    for (const def of neededObjects) {
      let value = null;

      // 1) Se tiver "load", tenta carregar pelo nome (com fallback para variações sem/ com WAWeb/use)
      if (def.load) {
        const loaded = fmarkRequireByCandidates(webpackRequire, def.load);
        if (loaded && loaded.module) {
          value = def.resolve(loaded.module);
        }
      }

      // 2) Se não achou ainda, varre os módulos WA*
      if (!value) {
        for (const moduleName of moduleIds) {
          const m = webpackRequire(moduleName);
          if (!m) continue;

          const result = def.resolve(m);
          if (result) {
            value = result;
            break;
          }
        }
      }

      if (value) {
        Store[def.id] = value;
      }
    }

    // Hook do sendMessage no padrão que você já usava
    if (Store.Chat && Store.SendTextMsgToChat) {
      Store.Chat.modelClass.prototype.sendMessage = function () {
        return Store.SendTextMsgToChat(this, ...arguments);
      };
    }

    // Hook em upsertVotesDb/upsertVotes (módulo oficial WA: WAWebDBPollsUpsertVotes) para notificar
    // votos de enquete. No WA atual os votos não disparam Store.Msg "add", só esta persistência.
    var pollVoteWrapNow = Date.now();
    for (var modName in webpackRequire.m) {
      try {
        var mod = webpackRequire(modName);
        if (!mod) continue;
        var modExports = mod && mod.default ? mod.default : mod;
        var orig = (mod && (mod.upsertVotesDb || mod.upsertVotes)) || (modExports && (modExports.upsertVotesDb || modExports.upsertVotes));
        if (typeof orig !== "function") continue;
        var target = mod.upsertVotesDb || mod.upsertVotes ? mod : modExports;
        (function (originalFunc, moduleObj) {
          var wrapped = async function () {
            var args = arguments;
            var result = await originalFunc.apply(this, args);
            var data = args[0];
            if (!Array.isArray(data) || !window.FMARK || !window.FMARK._pollResponseHandlers || !window.FMARK._pollResponseHandlers.length) return result;
            var Store = window.Store;
            if (!Store || !Store.Msg || !Store.Msg.get) return result;
            for (var i = 0; i < data.length; i++) {
              var d = data[i];
              if (!d || d.senderTimestampMs < pollVoteWrapNow) continue;
              try {
                var key = d.parentMsgKey;
                var keyStr = key && (key._serialized || (typeof key.toString === "function" ? key.toString() : key));
                var parentMsg = Store.Msg.get(keyStr) || (key && Store.Msg.get(key));
                if (!parentMsg || !parentMsg.pollOptions) continue;
                var selectedOptions = [];
                var ids = d.selectedOptionLocalIds || [];
                for (var j = 0; j < ids.length; j++) {
                  var opt = ids[j];
                  var o = parentMsg.pollOptions.find(function (p) { return p.localId === opt || p.localId == opt; });
                  if (o) selectedOptions[opt] = o;
                }
                var sender = d.sender;
                var senderSerialized = sender && (sender._serialized || (sender.toString && sender.toString()) || "");
                var user = "";
                var phoneNumber = null;
                // Se o sender é um LID (@lid), tentar converter para número de telefone
                if (sender && (sender.isLid && sender.isLid() || (senderSerialized && senderSerialized.includes("@lid")))) {
                  // Tentar obter número via WeblidPnCache.getPhoneNumber (módulo WAWebApiContact)
                  if (Store.WeblidPnCache && Store.WeblidPnCache.getPhoneNumber) {
                    try {
                      phoneNumber = Store.WeblidPnCache.getPhoneNumber(sender);
                      if (phoneNumber) {
                        user = phoneNumber.user || (phoneNumber._serialized || "").split("@")[0];
                        senderSerialized = phoneNumber._serialized || senderSerialized;
                      }
                    } catch (_) {}
                  }
                  // Fallback: tentar via ApiContact.getPhoneNumber
                  if (!user && Store.ApiContact && Store.ApiContact.getPhoneNumber) {
                    try {
                      phoneNumber = Store.ApiContact.getPhoneNumber(sender);
                      if (phoneNumber) {
                        user = phoneNumber.user || (phoneNumber._serialized || "").split("@")[0];
                        senderSerialized = phoneNumber._serialized || senderSerialized;
                      }
                    } catch (_) {}
                  }
                  // Fallback: tentar via Contact.get e propriedade phoneNumber
                  if (!user && Store.Contact && Store.Contact.get) {
                    try {
                      var contact = Store.Contact.get(sender) || Store.Contact.get(senderSerialized);
                      if (contact && contact.phoneNumber) {
                        user = contact.phoneNumber.user || (contact.phoneNumber._serialized || "").split("@")[0];
                        senderSerialized = contact.phoneNumber._serialized || senderSerialized;
                      }
                    } catch (_) {}
                  }
                }
                // Se ainda não obteve user, usa o valor padrão
                if (!user) {
                  user = (sender && (sender.user != null ? sender.user : senderSerialized.split("@")[0])) || "";
                }
                var msg = {
                  msgId: d.parentMsgKey,
                  sender: sender ? { _serialized: senderSerialized, user: user, lid: sender._serialized || (sender.toString && sender.toString()) } : {},
                  selectedOptions: selectedOptions,
                };
                if (msg.sender && msg.sender.user === undefined) msg.sender.user = user;
                // Guardar último voto para comparar com parâmetros capturados no navegador
                window.FMARK._lastPollVoteRaw = d;
                window.FMARK._lastPollVoteMsg = msg;
                if (window.FMARK._debugPollVoteParams) {
                  console.log("[FMARK poll] raw (upsertVotesDb):", d);
                  console.log("[FMARK poll] normalized (handlers):", msg);
                }
                window.FMARK._pollResponseHandlers.slice().forEach(function (h) {
                  try { h(msg); } catch (_) {}
                });
                // Atualizar a PollVoteCollection in-memory para a UI do WA refletir o voto em tempo real
                var Coll = Store.PollVoteCollection;
                var createModel = Store.createPollVoteModel;
                if (Coll && createModel) {
                  try {
                    var voteModel = createModel(d);
                    if (voteModel) Coll.add([voteModel]);
                  } catch (_) {}
                }
              } catch (_) {}
            }
            return result;
          };
          if (moduleObj.upsertVotesDb) moduleObj.upsertVotesDb = wrapped; else moduleObj.upsertVotes = wrapped;
        })(orig, target);
        break;
      } catch (_) {}
    }
  })();
}

// ================== FMARK CORE ==================
window.FMARK = {};
window.FMARK._pollResponseHandlers = [];
/**
 * Referência dos parâmetros de voto (wa-source) para comparar com o que você capturou no navegador.
 * Ative o log com: FMARK._debugPollVoteParams = true
 * Depois de um voto, compare no console:
 *   FMARK._lastPollVoteRaw   → payload bruto que entrou em upsertVotesDb (igual ao do WA)
 *   FMARK._lastPollVoteMsg  → objeto normalizado que passamos aos handlers (msgId, sender, selectedOptions)
 *
 * Formato oficial (wa-source):
 * - RECEBER (upsertVotesDb recebe): array de vote data com
 *   msgKey, parentMsgKey, sender (Wid), selectedOptionLocalIds (array), senderTimestampMs, t?, ack?, read?
 * - ENVIAR (quando vota no navegador): WAWebPollsGeneratePollVoteMessageProto gera
 *   pollUpdateMessage: { pollCreationMessageKey: encodeKey(pollUpdateParentKey), vote: encPollVote, senderTimestampMs }
 *   (encPollVote = voto criptografado com messageSecret da mensagem da enquete)
 */
window.FMARK._debugPollVoteParams = false;
window.FMARK._lastPollVoteRaw = null;
window.FMARK._lastPollVoteMsg = null;
/** Retorna o último voto em formato comparável (serializável) para diff com o que você capturou. */
window.FMARK.getLastPollVoteForCompare = function () {
  var raw = window.FMARK._lastPollVoteRaw;
  if (!raw) return null;
  return {
    raw: {
      msgKey: raw.msgKey && (raw.msgKey._serialized || (typeof raw.msgKey.toString === "function" ? raw.msgKey.toString() : raw.msgKey)),
      parentMsgKey: raw.parentMsgKey && (raw.parentMsgKey._serialized || (typeof raw.parentMsgKey.toString === "function" ? raw.parentMsgKey.toString() : raw.parentMsgKey)),
      sender: raw.sender && (raw.sender._serialized || (typeof raw.sender.toString === "function" ? raw.sender.toString() : raw.sender)),
      selectedOptionLocalIds: raw.selectedOptionLocalIds,
      senderTimestampMs: raw.senderTimestampMs,
      t: raw.t,
      ack: raw.ack,
      read: raw.read,
    },
    normalized: window.FMARK._lastPollVoteMsg,
  };
};
window._FMARK = {};

// ================== SERIALIZATION ==================
window.FMARK._serializeRawObj = (obj) => {
  if (obj && obj.toJSON) {
    return obj.toJSON();
  }
  return {};
};

window.FMARK._serializeWid = (wid) => {
  if (!wid) return undefined;
  if (typeof wid === "string") return wid;
  if (wid._serialized) return wid._serialized;
  if (typeof wid.toString === "function") return wid.toString();
  return undefined;
};

window.FMARK._isGroupWid = (wid) => {
  if (!wid) return false;
  if (typeof wid.isGroup === "function") return wid.isGroup();
  const widStr = window.FMARK._serializeWid(wid);
  return typeof widStr === "string" && widStr.includes("@g.us");
};

window.FMARK._isLidWid = (wid) => {
  if (!wid) return false;
  if (typeof wid.isLid === "function") return wid.isLid();
  const widStr = window.FMARK._serializeWid(wid);
  return typeof widStr === "string" && widStr.includes("@lid");
};

window.FMARK._isLinkMsg = (msg) => {
  return msg?.type === "chat" && msg?.subtype === "url";
};

window.FMARK._isNotificationMsg = (msg) => {
  if (!msg) return false;
  return [
    "notification",
    "notification_template",
    "gp2",
    "broadcast_notification",
    "e2e_notification",
    "call_log",
    "protocol",
    "debug",
    "ciphertext",
  ].includes(msg.type);
};

window.FMARK._isMmsMsg = (msg) => {
  if (!msg) return false;
  const type = msg.type;
  const subtype = msg.subtype;

  if (type === "protocol" && subtype === "history_sync_notification") return true;
  if (type === "native_flow" && msg.headerType != null && msg.headerType !== 0) return true;
  if (type === "interactive" && msg.interactiveHeader?.mediaType != null) return true;

  return [
    "image",
    "video",
    "ptv",
    "audio",
    "ptt",
    "sticker",
    "document",
    "product",
    "sticker-pack",
    "message_history_bundle",
  ].includes(type);
};

/**
 * Serializes a chat object
 *
 * @param rawChat Chat object
 * @returns {{}}
 */

window.FMARK._serializeChatObj = (obj) => {
  if (obj == undefined) {
    return null;
  }
  const isBroadcast = typeof obj.isBroadcast === "function" ? obj.isBroadcast() : obj.isBroadcast;
  const isGroup =
    typeof obj.isGroup === "function"
      ? obj.isGroup()
      : typeof obj.id?.isGroup === "function"
        ? obj.id.isGroup()
        : obj.isGroup;
  const isUser =
    typeof obj.isUser === "function"
      ? obj.isUser()
      : typeof obj.id?.isUser === "function"
        ? obj.id.isUser()
        : obj.isUser;

  return Object.assign(window.FMARK._serializeRawObj(obj), {
    kind: obj.kind,
    isBroadcast: isBroadcast,
    isGroup: isGroup,
    isUser: isUser,
    contact: obj["contact"] ? window.FMARK._serializeContactObj(obj["contact"]) : null,
    groupMetadata: obj["groupMetadata"] ? window.FMARK._serializeRawObj(obj["groupMetadata"]) : null,
    presence: obj["presence"] ? window.FMARK._serializeRawObj(obj["presence"]) : null,
    msgs: null,
  });
};

window.FMARK._serializeContactObj = (obj) => {
  if (obj == undefined) {
    return null;
  }

  let profile = null;
  try {
    if (!obj.profilePicThumb && obj.id && window.Store?.ProfilePicThumb) {
      let thumb = null;
      if (Store.ProfilePicThumb.get) {
        thumb = Store.ProfilePicThumb.get(obj.id);
      } else if (Store.ProfilePicThumb._index && obj.id._serialized) {
        thumb = Store.ProfilePicThumb._index[obj.id._serialized];
      }
      profile = thumb ? window.FMARK._serializeProfilePicThumb(thumb) : {};
    }
  } catch {}

  const formattedName =
    obj.formattedName ??
    (Store.ContactOptions?.getVerifiedName ? Store.ContactOptions.getVerifiedName(obj) : undefined);
  const isHighLevelVerified =
    obj.isHighLevelVerified ??
    (Store.ContactOptions?.getVerifiedLevel ? Store.ContactOptions.getVerifiedLevel(obj) : undefined);
  const isMe = obj.isMe ?? (Store.ContactOptions?.getIsMe ? Store.ContactOptions.getIsMe(obj) : undefined);
  const isWAContact =
    obj.isWAContact ?? (Store.ContactOptions?.getIsWAContact ? Store.ContactOptions.getIsWAContact(obj) : undefined);
  const statusMute =
    obj.statusMute ?? (Store.ContactOptions?.getStatusMute ? Store.ContactOptions.getStatusMute(obj) : undefined);
  const isVerified =
    typeof obj.isVerified === "boolean"
      ? obj.isVerified
      : Store.ContactOptions?.getVerifiedName
        ? !!Store.ContactOptions.getVerifiedName(obj)
        : obj.isVerified;

  return Object.assign(window.FMARK._serializeRawObj(obj), {
    formattedName: formattedName,
    isHighLevelVerified: isHighLevelVerified,
    isMe: isMe,
    isMyContact: obj.isMyContact,
    isPSA: obj.isPSA ?? (Store.ContactOptions?.getIsPSA ? Store.ContactOptions.getIsPSA(obj) : undefined),
    isUser: obj.isUser ?? (Store.ContactOptions?.getIsUser ? Store.ContactOptions.getIsUser(obj) : undefined),
    isVerified: isVerified,
    isWAContact: isWAContact,
    profilePicThumbObj: profile,
    statusMute: statusMute,
    msgs: null,
  });
};

window.FMARK._serializeMessageObj = (obj) => {
  if (obj == undefined) {
    return null;
  }
  if (obj.quotedMsg && obj.quotedMsgObj) obj.quotedMsgObj();

  const id = window.FMARK._serializeWid(obj?.id) ?? obj?.id;
  const from = window.FMARK._serializeWid(obj?.from) ?? obj?.from;
  const quotedParticipant = window.FMARK._serializeWid(obj?.quotedParticipant) ?? obj?.quotedParticipant;
  const author = window.FMARK._serializeWid(obj?.author) ?? obj?.author;
  const chatId = obj?.id?.remote || obj?.chatId?._serialized || window.FMARK._serializeWid(obj?.chatId) || obj?.chatId;
  const to = window.FMARK._serializeWid(obj?.to) ?? obj?.to;
  const quotedMsgId =
    window.FMARK._serializeWid(obj?._quotedMsgObj?.id) ?? obj?.quotedStanzaID ?? obj?._quotedMsgObj?.id;

  const isGroupMsg = typeof obj.isGroupMsg === "boolean" ? obj.isGroupMsg : window.FMARK._isGroupWid(obj?.id?.remote);
  const isLidMsg = typeof obj.isLidMsg === "boolean" ? obj.isLidMsg : window.FMARK._isLidWid(obj?.id?.remote);
  const isLink = typeof obj.isLink === "boolean" ? obj.isLink : window.FMARK._isLinkMsg(obj);
  const isMMS = typeof obj.isMMS === "boolean" ? obj.isMMS : window.FMARK._isMmsMsg(obj);
  const isMedia = typeof obj.isMedia === "boolean" ? obj.isMedia : isMMS;
  const isNotification =
    typeof obj.isNotification === "boolean" ? obj.isNotification : window.FMARK._isNotificationMsg(obj);

  return Object.assign(window.FMARK._serializeRawObj(obj), {
    id: id,
    from: from,
    quotedParticipant: quotedParticipant,
    author: author,
    chatId: chatId,
    to: to,
    fromMe: obj?.id?.fromMe,
    sender: obj["senderObj"] ? FMARK._serializeContactObj(obj["senderObj"]) : null,
    timestamp: obj["t"],
    content: obj["body"],
    isGroupMsg: isGroupMsg,
    isLidMsg: isLidMsg,
    isLink: isLink,
    isMMS: isMMS,
    isMedia: isMedia,
    isNotification: isNotification,
    isPSA: obj.isPSA,
    type: obj.type,
    quotedMsgId: quotedMsgId,
    mediaData: window.FMARK._serializeRawObj(obj["mediaData"]),
  });
};

window.FMARK._serializeNumberStatusObj = (obj) => {
  if (obj == undefined) {
    return null;
  }

  return Object.assign(
    {},
    {
      id: obj.jid,
      status: obj.status,
      isBusiness: obj.biz === true,
      canReceiveMessage: obj.status === 200,
    },
  );
};

window.FMARK._serializeNumberStatusObjMD = (obj) => {
  if (obj == undefined) {
    return null;
  }

  let awid = false;

  var _awid = "" + obj.wid + "";

  if (_awid.length > 0) {
    awid = true;
  } else {
    awid = false;
  }

  console.log("_awid: " + awid);

  return Object.assign(
    {},
    {
      id: obj.wid,
      status: awid,
      //isBusiness: (obj.biz === true)
    },
  );
};

window.FMARK._serializeProfilePicThumb = (obj) => {
  if (obj == undefined) {
    return null;
  }

  return Object.assign(
    {},
    {
      eurl: obj.eurl,
      id: obj.id,
      img: obj.img,
      //imgFull: obj.imgFull,
      imgFull: obj.imgFull ?? obj.__x_imgFull,
      raw: obj.raw,
      tag: obj.tag,
    },
  );
};

window.FMARK.getIsMyContactMD = function (contact) {
  try {
    return contact.isMyContact;
  } catch {
    return false;
  }
};

/**
 * Cria um grupo no WhatsApp Web.
 *
 * Mantém retorno compatível: retorna o ID serializado do grupo (`...@g.us`) ou `false` em caso de falha.
 *
 * @example
 * ```js
 * const gid = await FMARK.createGroup('Meu Grupo', ['5511999999999@c.us']);
 * console.log(gid); // '1203...@g.us' | false
 *
 * // Opções extras (quando suportado pelo WA interno)
 * await FMARK.createGroup('Meu Grupo', ['5511...@c.us'], { announce: true, restrict: false });
 * ```
 *
 * @param {string} name Nome do grupo.
 * @param {string|object|Array<string|object>} contactsKeys Participantes (wid/ids/ContactModels).
 * @param {object} [extra] Opções adicionais (ex: `announce`, `restrict`, `ephemeralDuration`).
 * @returns {Promise<string|false>} ID do grupo ou `false`.
 */
window.FMARK.createGroup = async function (name, contactsKeys, extra = {}) {
  const keys = Array.isArray(contactsKeys) ? contactsKeys : contactsKeys ? [contactsKeys] : [];
  if (!keys.length || !window.Store?.WidFactory) return false;

  // 1) montar participantes com suporte a LID quando existir
  const toWid = (value) => {
    try {
      if (!value) return null;
      if (typeof value === "string") {
        if (value.includes("@")) return Store.WidFactory.createWid(value);
        if (Store.WidFactory.createUserWid) return Store.WidFactory.createUserWid(value);
        return Store.WidFactory.createWid(`${value}@c.us`);
      }
      if (typeof value.isLid === "function" || typeof value.isUser === "function" || value.isWidlike) {
        return value;
      }
      if (value._serialized && Store.WidFactory.createWid) {
        return Store.WidFactory.createWid(value._serialized);
      }
      if (value.toString && typeof value.toString === "function") {
        const asString = value.toString();
        if (typeof asString === "string" && asString.includes("@")) {
          return Store.WidFactory.createWid(asString);
        }
      }
    } catch {}
    return null;
  };

  const participants = [];
  const participantWids = [];
  const seen = new Set();

  for (const key of keys) {
    let contact = null;
    try {
      if (key && key.id) {
        contact = key;
      } else if (window.Store?.Contact?.get) {
        contact = window.Store.Contact.get(key);
      }
    } catch {}

    let wid = toWid(contact?.id) || toWid(key);

    if (!wid) continue;

    const widKey = wid?._serialized || (wid.toString ? wid.toString() : String(wid));
    if (seen.has(widKey)) continue;
    seen.add(widKey);

    participantWids.push(wid);

    try {
      const lidInfo = contact?.getCurrentLidContact?.();
      if (lidInfo?.lid) {
        const lidWid = toWid(lidInfo.lid);
        const pnWid = toWid(lidInfo.phoneNumber) || wid;
        participants.push({
          phoneNumber: pnWid,
          lid: lidWid || null,
        });
        continue;
      }
    } catch {}

    try {
      const lidFromCache = fmarkGetCurrentLid(wid);
      const lidWid = toWid(lidFromCache);
      if (lidWid && lidWid !== wid) {
        const pn = Store.WeblidPnCache?.getPhoneNumber ? Store.WeblidPnCache.getPhoneNumber(lidWid) : null;
        const pnWid = toWid(pn) || wid;
        participants.push({
          phoneNumber: pnWid,
          lid: lidWid,
        });
        continue;
      }
    } catch {}

    participants.push({
      phoneNumber: wid,
    });
  }

  if (!participants.length) return false;

  // 3) parametros padrao (compatibilidade com WPP)
  const defaultParams = {
    announce: true,
    ephemeralDuration: 0,
    memberAddMode: false,
    memberLinkMode: false,
    membershipApprovalMode: false,
    parentGroupId: null,
    restrict: false,
  };

  const requestData = {
    title: name,
    ...defaultParams,
    ...extra,
  };

  try {
    if (window.Store.createGroup) {
      let isActionCreateGroup = false;
      try {
        const fn = window.Store.createGroup;
        if (fn && fn.length >= 3 && window.Store.GroupMutationParticipantUtils?.getGroupMutationParticipant) {
          isActionCreateGroup = true;
        } else {
          const src = String(fn || "");
          if (src.includes("GroupMutationParticipant") || src.includes("groupMutationParticipant")) {
            isActionCreateGroup = true;
          }
        }
      } catch {}

      if (isActionCreateGroup) {
        const result = await window.Store.createGroup(requestData, participantWids);
        return result?.gid?._serialized || result?.wid?._serialized || result?.id?._serialized || false;
      }

      const result = await window.Store.createGroup(requestData, participants);
      return result?.wid?._serialized || false;
    }

    if (window.Store.sendCreateGroup) {
      const result = await window.Store.sendCreateGroup(requestData.title, participantWids);
      return result?.wid?._serialized || result?.id?._serialized || false;
    }

    if (window.Store.Wap?.createGroup) {
      const widsSerialized = participantWids
        .map((wid) => wid?._serialized || (wid.toString ? wid.toString() : wid))
        .filter(Boolean);
      const result = await window.Store.Wap.createGroup(requestData.title, widsSerialized);
      return result?.gid?._serialized || result?.gid || false;
    }

    return false;
  } catch (err) {
    console.error("Falha ao criar o grupo:", err);
    return false;
  }
};

window.FMARK.leaveGroup = async function (e) {
  e = "string" == typeof e ? e : e._serialized;
  var t = FMARK.getChat(e);
  return Store.GroupActions.sendExitGroup(t);
};

// ================== CONTACTS ==================
window.FMARK.getAllContacts = function (done) {
  const contacts = window.Store.Contact.map((contact) => {
    if (window.FMARK.getIsMyContactMD(contact) && contact.id.server !== "lid") {
      return FMARK._serializeContactObj(contact);
    } else {
      return undefined; // Não é um contato válido, então retornamos undefined
    }
  }).filter((contact) => contact !== undefined);

  if (done !== undefined) done(contacts);

  SetConsoleMessage("getAllContacts", JSON.stringify(contacts));

  return contacts;
};

window.FMARK.getAllContactsListNumbers = function (done) {
  const contacts = window.Store.Contact.map((contact) => {
    if (window.FMARK.getIsMyContactMD(contact) && contact.id.server == "c.us") {
      return contact.id.user;
    } else {
      return undefined; // Não é um contato válido, então retornamos undefined
    }
  }).filter((contact) => contact !== undefined);

  if (done !== undefined) done(contacts);
  return JSON.stringify(contacts);
};

/**
 * Fetches all contact objects from store, filters them
 *
 * @param done Optional callback function for async execution
 * @returns {Array|*} List of contacts
 */
window.FMARK.getMyContacts = function (done) {
  const contacts = window.Store.Contact.filter((contact) => FMARK._serializeContactObj(contact));
  if (done !== undefined) done(contacts);
  return contacts;
};

/**
 * Fetches contact object from store by ID
 *
 * @param id ID of contact
 * @param done Optional callback function for async execution
 * @returns {T|*} Contact object
 */
window.FMARK.getContact = function (id, done) {
  const found = window.Store.Contact.get(id);

  if (done !== undefined) done(window.FMARK._serializeContactObj(found));
  return window.FMARK._serializeContactObj(found);
};

/**
 * Adiciona/salva um contato (sem depender do WPP).
 *
 * Mantém compatibilidade com chamadas antigas:
 * - Pode receber um array em `options` ou `_result` para fazer `push` do resultado.
 * - Retorna `false` em erro; em sucesso retorna o contato serializado (quando possível) ou `true`.
 *
 * @example
 * ```js
 * await FMARK.addContact('5511999999999', 'João');
 * await FMARK.addContact('5511999999999@c.us', 'João', { lastName: 'Silva', syncAddressBook: true });
 * ```
 *
 * @param {string} contactId Número ou wid (`...@c.us`).
 * @param {string} firstName Primeiro nome.
 * @param {object|Array} [options] Opções ou array de retorno (compat).
 * @param {Array} [_result] Array de retorno (compat).
 * @returns {Promise<false|true|object>} Resultado compatível.
 */
window.FMARK.addContact = async function (contactId, firstName, options, _result) {
  var resultList = null;
  var opts = {};

  if (Array.isArray(options)) {
    resultList = options;
  } else if (Array.isArray(_result)) {
    resultList = _result;
  }

  if (options && !Array.isArray(options)) {
    opts = options;
  }

  try {
    if (!contactId || !firstName) {
      if (resultList) resultList.push("invalid");
      return false;
    }

    if (!Store || !Store.WidFactory || !Store.saveContactAction) {
      if (resultList) resultList.push("store_unavailable");
      return false;
    }

    var id = contactId;
    if (typeof id === "string" && !id.includes("@")) {
      id = id + "@c.us";
    }

    var wid = Store.WidFactory.createWid(id);
    var alternateWid =
      Store.ApiContact && Store.ApiContact.getAlternateUserWid ? Store.ApiContact.getAlternateUserWid(wid) : wid;

    var lid =
      wid.isLid && wid.isLid()
        ? wid.user
        : alternateWid && alternateWid.isLid && alternateWid.isLid()
          ? alternateWid.user
          : null;

    var phoneNumber =
      wid.server === "c.us" ? wid.user : alternateWid && alternateWid.server === "c.us" ? alternateWid.user : null;

    var syncToAddressbook = opts.syncAddressBook ?? opts.syncAdressBook ?? true;
    var lastName = opts.lastName ?? opts.surname ?? "";

    function parseVersion(v) {
      return String(v || "")
        .split(".")
        .map((part) => parseInt(part.replace(/\D/g, ""), 10) || 0);
    }

    function isVersionGTE(current, target) {
      var cur = parseVersion(current);
      var tgt = parseVersion(target);
      var len = Math.max(cur.length, tgt.length);
      for (var i = 0; i < len; i++) {
        var a = cur[i] || 0;
        var b = tgt[i] || 0;
        if (a > b) return true;
        if (a < b) return false;
      }
      return true;
    }

    var useV2 = isVersionGTE(window.Debug?.VERSION, "2.3000.1030209354");

    if (useV2 && Store.saveContactActionV2) {
      await Store.saveContactActionV2({
        phoneNumber: phoneNumber,
        prevPhoneNumber: null,
        lid: lid,
        username: null,
        firstName: firstName,
        lastName: lastName,
        syncToAddressbook: syncToAddressbook,
      });
    } else {
      if (!phoneNumber) {
        if (resultList) resultList.push("invalid_contact");
        return false;
      }

      await Store.saveContactAction(phoneNumber, null, null, null, firstName, lastName, syncToAddressbook);
    }

    var saved = Store.Contact.get(wid);
    var serialized = saved ? FMARK._serializeContactObj(saved) : true;

    if (resultList) resultList.push(serialized);
    return serialized;
  } catch (err) {
    console.log(err);
    if (resultList) resultList.push("failed");
    return false;
  }
};

// ================== CHATS ==================
/**
 * Fetches all chat objects from store
 *
 * @param done Optional callback function for async execution
 * @returns {Array|*} List of chats
 */
window.FMARK.getAllChats = function (done) {
  const chats = window.Store.Chat.map((chat) => FMARK._serializeChatObj(chat));

  if (done !== undefined) done(chats);

  SetConsoleMessage("getAllChats", JSON.stringify(chats));

  return chats;
};

window.FMARK.haveNewMsg = function (chat) {
  return chat.unreadCount > 0;
};

window.FMARK.CreateGroupCustom = async function (GroupName, defaultNumber, _result) {
  try {
    // Verifica se o número já possui o sufixo @c.us
    const formattedNumber = defaultNumber.endsWith("@c.us") ? defaultNumber : defaultNumber + "@c.us";

    // Tenta criar o grupo com o número formatado
    await window.FMARK.groupCreate(GroupName, [formattedNumber]);
    _result.push("Success");
  } catch (err) {
    console.log(err);
    _result.push("failed");
  }
  return _result;
};

window.FMARK.getAllChatsWithNewMsg = function (done) {
  const chats = window.Store.Chat.filter(window.FMARK.haveNewMsg).map((chat) => FMARK._serializeChatObj(chat));

  if (done !== undefined) done(chats);
  return chats;
};

/**
 * Fetches all chat IDs from store
 *
 * @param done Optional callback function for async execution
 * @returns {Array|*} List of chat id's
 */
window.FMARK.getAllChatIds = function (done) {
  const chatIds = window.Store.Chat.map((chat) => chat.id._serialized || chat.id);

  if (done !== undefined) done(chatIds);
  return chatIds;
};

// ================== UNREAD AND BUFFER ==================
window.FMARK.getAllNewMessages = async function () {
  return JSON.stringify(
    FMARK.getAllChatsWithNewMsg()
      .map((c) => FMARK.getChat(c.id._serialized))
      .map((c) => c.msgs._models.filter((x) => x.isNewMsg)) || [],
  );
};

window.FMARK.filterUnreadMessages = async function () {
  var msgList = [];
  var OriginalList = await FMARK.getAllUnreadMessages();

  for (var i = 0; i < OriginalList.length; i++) {
    if (OriginalList[i].chatId.server.includes("g.us") == false && OriginalList[i].body !== undefined) {
      msgList.push({
        id: OriginalList[i].id,
        body: OriginalList[i].body,
        chatId: OriginalList[i].chatId.user,
        name: OriginalList[i].notifyName,
      });
    }
  }
  var msgListJSON = JSON.stringify(msgList);
  return msgListJSON;
};

window.FMARK.filterNewChatsUnreadMessages = async function () {
  var msgList = [];
  var OriginalList = await FMARK.getAllUnreadMessages();

  for (var i = 0; i < OriginalList.length; i++) {
    if (
      OriginalList[i].chatId.server.includes("g.us") == false &&
      OriginalList[i].body !== undefined &&
      OriginalList[i].chat.hasOpened !== true
    ) {
      msgList.push({
        id: OriginalList[i].id,
        body: OriginalList[i].body,
        chatId: OriginalList[i].chatId.user,
        name: OriginalList[i].notifyName,
      });
    }
  }
  var msgListJSON = JSON.stringify(msgList);
  return msgListJSON;
};

window.FMARK.getFilteredBufferedNewMessages = function (done) {
  let bufferedMessages = window.FMARK._newMessagesBuffer;
  console.log(bufferedMessages);
  var msgList = [];
  for (var i = 0; i < bufferedMessages.length; i++) {
    if (
      bufferedMessages[i].chatId &&
      bufferedMessages[i].chatId.server &&
      bufferedMessages[i].chatId.server.includes("g.us") == false &&
      bufferedMessages[i].body !== undefined
    ) {
      msgList.push({
        id: bufferedMessages[i].id,
        body: bufferedMessages[i].body,
        chatId: bufferedMessages[i].chatId.user,
        name: bufferedMessages[i].notifyName,
      });
    }
  }
  var msgListJSON = JSON.stringify(msgList);
  window.FMARK._newMessagesBuffer = [];
  return msgListJSON;
};

window.FMARK.getFilteredBufferedNewChatsNewMessages = function (done) {
  let bufferedMessages = window.FMARK._newMessagesBuffer;
  console.log(bufferedMessages);
  window.FMARK._newMessagesBuffer = [];
  var msgList = [];
  for (var i = 0; i < bufferedMessages.length; i++) {
    if (
      bufferedMessages[i].chatId &&
      bufferedMessages[i].chatId.server &&
      bufferedMessages[i].chatId.server.includes("g.us") == false &&
      bufferedMessages[i].body !== undefined &&
      bufferedMessages[i].chat.hasOpened !== true
    ) {
      msgList.push({
        id: bufferedMessages[i].id,
        body: bufferedMessages[i].body,
        chatId: bufferedMessages[i].chatId.user,
        name: bufferedMessages[i].notifyName,
      });
    }
  }
  var msgListJSON = JSON.stringify(msgList);
  return msgListJSON;
};

/**
 * Fetches all groups objects from store
 *
 * @param done Optional callback function for async execution
 * @returns {Array|*} List of chats
 */

// ================== GROUPS ==================
window.FMARK.getAllGroups = function (done) {
  let groups = window.Store.Chat.filter((chat) => chat.id.server == "g.us");

  if (done !== undefined) done(groups);

  let arrGroups = [];
  let arr = groups;
  arr.forEach((v, i) => {
    arrGroups.push(arr[i]["id"]["_serialized"] + " " + arr[i]["formattedTitle"]);
  });

  SetConsoleMessage("getAllGroups", JSON.stringify(arrGroups));

  return groups;
};

window.FMARK.setGroupTitle = async function (groupId, title) {
  const chat = window.Store.WidFactory.createWid(groupId);
  const m = { type: "setGroupTitle", title };
  const To = await FMARK.getChatById(chat);
  return window.Store.GroupTitle.sendSetGroupSubject(chat, title)
    .then(() => {
      return true;
    })
    .catch(() => {
      return false;
    });
};

//01/06/2020
window.FMARK.getAllGroupsList = function (done) {
  const contacts = window.Store.Contact.map((contact) => FMARK._serializeContactObj(contact));

  if (done !== undefined) done(contacts);

  SetConsoleMessage("getAllGroups", JSON.stringify(contacts));

  return contacts;
};

// ================== CHAT UTILITIES ==================
/**
 * Sets the chat state
 *
 * @param {0|1|2} chatState The state you want to set for the chat. Can be TYPING (1), RECRDING (2) or PAUSED (3);
 * returns {boolean}
 */
window.FMARK.sendChatstate = async function (state, chatId) {
  var chatIdfin = window.Store.WidFactory.createWid(chatId);
  switch (state) {
    case 0:
      await window.Store.ChatStates.sendChatStateComposing(chatIdfin);
      break;

    case 1:
      await window.Store.ChatStates.sendChatStateRecording(chatIdfin);
      break;

    case 2:
      await window.Store.ChatStates.sendChatStatePaused(chatIdfin);
      break;

    default:
      return false;
  }
  return true;
};

/**
 * Fetches chat object from store by ID
 *
 * @param id ID of chat
 * @returns {T|*} Chat object
 */
window.FMARK.getChat = function (id) {
  const resolvedWid = fmarkResolveChatWidSync(id);
  const lookup = resolvedWid || (typeof id == "string" ? id : id?._serialized);
  let found = window.Store.Chat.get(lookup);
  if (!found && lookup !== id) {
    const fallback = typeof id == "string" ? id : id?._serialized;
    if (fallback) {
      found = window.Store.Chat.get(fallback);
    }
  }
  if (found && !found.sendMessage) {
    found.sendMessage = function () {
      if (window.Store && window.Store.SendTextMsgToChat) {
        return window.Store.SendTextMsgToChat(this, ...arguments);
      }
      if (window.Store && window.Store.sendMessage) {
        return window.Store.sendMessage.apply(this, arguments);
      }
    };
  }
  return found;
};

window.FMARK.getChatByName = function (name, done) {
  const create_chat = window.Store.FindChat.findOrCreateLatestChat((chat) => chat.name === name);
  const found = create_chat?.chat;
  if (done !== undefined) done(found);
  return found;
};

window.FMARK.sendImageFromDatabasePicBot = function (picId, chatId, caption) {
  var chatDatabase = window.FMARK.getChatByName("DATABASEPICBOT");
  var msgWithImg = chatDatabase.msgs.find((msg) => msg.caption == picId);

  if (msgWithImg === undefined) {
    return false;
  }
  var chatSend = FMARK.getChat(chatId);
  if (chatSend === undefined) {
    return false;
  }
  const oldCaption = msgWithImg.caption;

  msgWithImg.id.id = window.FMARK.getNewId();
  msgWithImg.id.remote = chatId;
  msgWithImg.t = Math.ceil(new Date().getTime() / 1000);
  msgWithImg.to = chatId;

  if (caption !== undefined && caption !== "") {
    msgWithImg.caption = caption;
  } else {
    msgWithImg.caption = "";
  }

  msgWithImg.collection.send(msgWithImg).then(function (e) {
    msgWithImg.caption = oldCaption;
  });

  return true;
};

window.FMARK.getGeneratedUserAgent = function (useragent) {
  if (!useragent.includes("WhatsApp")) return "WhatsApp/0.4.315 " + useragent;
  return useragent.replace(
    useragent
      .match(/WhatsApp\/([.\d])*/g)[0]
      .match(/[.\d]*/g)
      .find((x) => x),
    window.Debug.VERSION,
  );
};

window.FMARK.getWAVersion = function () {
  return window.Debug.VERSION;
};

/**
 * Automatically sends a link with the auto generated link preview. You can also add a custom message to be added.
 * @param chatId
 * @param url string A link, for example for youtube. e.g https://www.youtube.com/watch?v=61O-Galzc5M
 * @param text string Custom text as body of the message, this needs to include the link or it will be appended after the link.
 */
window.FMARK.sendLinkWithAutoPreview = async function (chatId, url, text) {
  try {
    const resolvedId = await window.FMARK.getLidFromPhoneID(chatId);
    var idUser = new window.Store.UserConstructor(resolvedId || chatId, {
      intentionallyUsePrivateConstructor: true,
    });

    const fromwWid = await window.Store.Conn.wid;

    let linkPreview = null;
    try {
      if (Store.WapQuery && Store.WapQuery.queryLinkPreview) {
        linkPreview = await Store.WapQuery.queryLinkPreview(url);
      } else if (Store.queryLinkPreview) {
        linkPreview = await Store.queryLinkPreview(url);
      }
    } catch (e) {}

    const create_chat = await Store.FindChat.findOrCreateLatestChat(idUser);
    const targetChat = create_chat?.chat ?? Store.Chat.get(idUser);
    if (!targetChat) {
      return false;
    }

    const bodyText = text ? (text.includes(url) ? text : `${url}
${text}`) : url;

    if (!Store.addAndSendMsgToChat) {
      if (targetChat.sendMessage) {
        await targetChat.sendMessage(bodyText);
        return true;
      }
      return false;
    }

    var newId = window.FMARK.getNewMessageId(chatId);

    var message = fmarkBuildMessageBase({
      id: newId,
      from: fromwWid,
      to: targetChat.id,
      local: true,
      self: "out",
      type: "chat",
      body: bodyText,
    });
    message.subtype = linkPreview ? "url" : null;

    if (linkPreview) {
      message.canonicalUrl = linkPreview.canonicalUrl;
      message.description = linkPreview.description;
      message.doNotPlayInline = linkPreview.doNotPlayInline;
      message.matchedText = linkPreview.matchedText;
      message.preview = linkPreview.preview;
      message.thumbnail = linkPreview.thumbnail;
      message.title = linkPreview.title;
    }

    return await Promise.all(Store.addAndSendMsgToChat(targetChat, message));
  } catch (error) {
    console.error("Error in sendLinkWithAutoPreview:", error);
    return false;
  }
};

window.FMARK.sendMessageWithThumb = function (thumb, url, title, description, text, chatId) {
  var chatSend = FMARK.getChat(chatId);
  if (chatSend === undefined) {
    return false;
  }
  var linkPreview = {
    canonicalUrl: url,
    description: description,
    matchedText: url,
    title: title,
    thumbnail: thumb, // Thumbnail max size allowed: 200x200
  };
  chatSend.sendMessage(text.includes(url) ? text : `${url}
${text}`, {
    linkPreview: linkPreview,
    mentionedJidList: [],
    quotedMsg: null,
    quotedMsgAdminGroupJid: null,
  });
  return true;
};

window.FMARK.getNewId = function () {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < 20; i++) text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
};

window.FMARK.getChatById = function (id, done) {
  let found = FMARK.getChat(id);
  if (found) {
    found = FMARK._serializeChatObj(found);
  } else {
    found = false;
  }

  if (done !== undefined) done(found);
  return found;
};

// ================== MESSAGE RETRIEVAL ==================
/**
 * Retorno todas as mensagens nao lidas de um bate-papo solicitado e as marca como lidas.
 *
 * :param id: chat id
 * :type id: string
 *
 * :param includeMe: indicates if user messages have to be included
 * :type includeMe: boolean
 *
 * :param includeNotifications: indicates if notifications have to be included
 * :type includeNotifications: boolean
 *
 * :param done: callback passed by selenium
 * :type done: function
 *
 * :returns: list of unread messages from asked chat
 * :rtype: object
 */
window.FMARK.getUnreadMessagesInChat = function (id, includeMe, includeNotifications, done) {
  // get chat and its messages
  let chat = FMARK.getChat(id);
  if (!chat || !chat.msgs) {
    if (done !== undefined) done([]);
    return [];
  }
  let messages = chat.msgs._models || [];

  // initialize result list
  let output = [];

  // look for unread messages, newest is at the end of array
  for (let i = messages.length - 1; i >= 0; i--) {
    // system message: skip it
    if (i === "remove") {
      continue;
    }

    // get message
    let messageObj = messages[i];

    // found a read message: stop looking for others
    if (typeof messageObj.isNewMsg !== "boolean" || messageObj.isNewMsg === false) {
      continue;
    } else {
      messageObj.isNewMsg = false;
      // process it
      let message = FMARK.processMessageObj(messageObj, includeMe, includeNotifications);

      // save processed message on result list
      if (message) output.push(message);
    }
  }
  // callback was passed: run it
  if (done !== undefined) done(output);
  // return result list
  return output;
};

/**
 * Load more messages in chat object from store by ID
 *
 * @param id ID of chat
 * @param done Optional callback function for async execution
 * @returns None
 */
window.FMARK.loadEarlierMessages = function (id, done) {
  const found = FMARK.getChat(id);
  if (done !== undefined) {
    found.loadEarlierMsgs().then(function () {
      done();
    });
  } else {
    found.loadEarlierMsgs();
  }
};

window.FMARK.getTimePtt = async function (base64, chat_id) {
  const resolvedId = await window.FMARK.getLidFromPhoneID(chat_id);
  var idUser = fmarkEnsureWid(resolvedId || chat_id);
  if (!idUser) return null;

  var create_chat = await Store.FindChat.findOrCreateLatestChat(idUser);
  const chat = create_chat?.chat;
  var mediaBlob = window.FMARK.base64ImageToFile(base64, "");
  var mc = new Store.MediaCollection(chat);
  await mc.processAttachmentsForChat([{ file: mediaBlob }], 1, chat);
  return mc._models[0].mediaPrep.mediaData.duration;
};

/**
 * Load more messages in chat object from store by ID
 *
 * @param id ID of chat
 * @param done Optional callback function for async execution
 * @returns None
 */
window.FMARK.loadAllEarlierMessages = function (id, done) {
  const found = FMARK.getChat(id);
  x = function () {
    if (!found.msgs.msgLoadState.noEarlierMsgs) {
      found.loadEarlierMsgs().then(x);
    } else if (done) {
      done();
    }
  };
  x();
};

window.FMARK.asyncLoadAllEarlierMessages = function (id, done) {
  done();
  window.FMARK.loadAllEarlierMessages(id);
};

window.FMARK.areAllMessagesLoaded = function (id, done) {
  const found = FMARK.getChat(id);
  if (!found.msgs.msgLoadState.noEarlierMsgs) {
    if (done) done(false);
    return false;
  }
  if (done) done(true);
  return true;
};

/**
 * Load more messages in chat object from store by ID till a particular date
 *
 * @param id ID of chat
 * @param lastMessage UTC timestamp of last message to be loaded
 * @param done Optional callback function for async execution
 * @returns None
 */

window.FMARK.loadEarlierMessagesTillDate = function (id, lastMessage, done) {
  const found = FMARK.getChat(id);
  x = function () {
    if (found.msgs.models[0].t > lastMessage) {
      found.loadEarlierMsgs().then(x);
    } else {
      done();
    }
  };
  x();
};
// ================== GROUP SETTINGS AND METADATA ==================
var groupSettings = {
  //AtenÃ§Ã£o o valor nÃ£o Ã© mais 'true' ou 'false' mas sim '0' ou '1'.
  /*
   * Definir como pode enviar mensagem no grupo
   * `true` only admins
   * `false` everyone
   */
  ANNOUNCEMENT: "announcement",

  /**
   * Definir como pode editar os dados do grupo
   * `true` only admins
   * `false` everyone
   */
  RESTRICT: "restrict",

  /**
   * Non-Documented
   */
  NO_FREQUENTLY_FORWARDED: "no_frequently_forwarded",

  /**
   * Habilitar ou desabilitar mensagens temporÃ¡rias
   * `true` to enable
   * `false` to disable
   */
  EPHEMERAL: "ephemeral",
};

window.FMARK.setGroupSettings = async function setGroupSettings(groupId, settings, value) {
  if (typeof settings != "string" || settings.length === 0) {
    return "It is necessary to write a settings!";
  }
  const chat = window.Store.WidFactory.createWid(groupId);
  return Store.setGroupOptions
    .setGroupProperty(chat, settings, value)
    .then(() => {
      return true;
    })
    .catch(() => {
      return false;
    });
};

/**
 * Fetches all group metadata objects from store
 *
 * @param done Optional callback function for async execution
 * @returns {Array|*} List of group metadata
 */
window.FMARK.getAllGroupMetadata = function (done) {
  const groupData = window.Store.GroupMetadata.map((groupData) => groupData.all);

  if (done !== undefined) done(groupData);
  return groupData;
};

/**
 * Fetches group metadata object from store by ID
 *
 * @param id ID of group
 * @param done Optional callback function for async execution
 * @returns {T|*} Group metadata object
 */

/* Deprecated 02/06/2020
window.FMARK.getGroupMetadata = async function(id, done) {
    let output = window.Store.GroupMetadata.get(id);

    if (output !== undefined) {
        if (output.stale) {
            await output.update();
        }
    }

    if (done !== undefined) done(output);
    return output;

}; */

window.FMARK.setPictureUserGroup = async function (b64_640, b64_96, id) {
  let obj = { a: b64_640, b: b64_96 };
  var userId = new window.Store.UserConstructor(id, {
    intentionallyUsePrivateConstructor: true,
  });
  let base64 = "data:image/jpeg;base64,";
  return await Store.Profile.sendSetPicture(userId, base64 + obj.b, base64 + obj.a);
};

window.FMARK.setGroupIcon = async function (groupId, imgData) {
  var idUser = new window.Store.UserConstructor(groupId, {
    intentionallyUsePrivateConstructor: true,
  });
  const { status } = await Store.Profile.sendSetPicture(idUser, imgData, imgData);
  return status == 200;
};

window.FMARK.getGroupMetadata = function (id) {
  return window.Store.GroupMetadata.find(new Store.WidFactory.createWid(id));
};

window.FMARK.getAllParticipantsGroup = async function (id) {
  var group = await window.FMARK.getGroupMetadata(id);
  return JSON.stringify(group.participants._models.map((e) => e.contact?.phoneNumber.user));
};

/**
 * Fetches group participants
 *
 * @param id ID of group
 * @returns {Promise.<*>} Yields group metadata
 * @private
 */
window.FMARK._getGroupParticipants = async function (id) {
  const metadata = await FMARK.getGroupMetadata(id);
  return metadata.participants;
};

window.FMARK._getGroupParticipants2 = async function (id) {
  const metadata = await FMARK.getGroupMetadata(id);
  const chats = metadata.participants._models.map((chat) => FMARK._serializeChatObj(chat).id._serialized);
  return chats.toString();
};

/**
 * Fetches IDs of group participants
 *
 * @param id ID of group
 * @param done Optional callback function for async execution
 * @returns {Promise.<Array|*>} Yields list of IDs
 */

/*
window.FMARK.getGroupParticipantIDs = async function (id) {
    return (await FMARK._getGroupParticipants(id))
        .map((participant) => participant.id);
}; */

window.FMARK.getGroupParticipantIDs = async function (id, done) {
  const output = (await FMARK._getGroupParticipants(id)).map((participant) => participant.id);

  if (done !== undefined) done(output);
  getAllGroupContacts(JSON.stringify(output));

  return output;
};

window.FMARK.getGroupAdmins = async function (id, done) {
  const output = (await FMARK._getGroupParticipants(id))
    .filter((participant) => participant.isAdmin)
    .map((admin) => admin.id);

  if (done !== undefined) done(output);
  let arrGroupAdm = [];
  let arr = output;
  arr.forEach((v, i) => {
    arrGroupAdm.push(arr[i]["_serialized"]);
  });
  SetConsoleMessage("getAllGroupAdmins", JSON.stringify(arrGroupAdm));

  return output;
};

window.FMARK.getMyGroups = function () {
  var myGroups = Store.GroupMetadata.filter((e) => e.participants.iAmAdmin()).map((e) => e.id._serialized);
  //SetConsoleMessage("getAllGroupAdmins", JSON.stringify(myGroups));
  return myGroups;
};

// ================== PROFILE AND STATUS ==================
/**
 * Gets object representing the logged in user
 *
 * @returns {Array|*|$q.all}
 */
window.FMARK.getMe = function (done) {
  const rawMe = window.Store.Contact.get(window.Store.Conn.me);

  if (done !== undefined) done(rawMe.all);
  return rawMe.all;
};

window.FMARK.isLoggedIn = function (done) {
  // Contact always exists when logged in
  const isLogged = window.Store.Contact && window.Store.Contact.length >= 0;

  if (done !== undefined) done(isLogged);
  return isLogged;
};

//Funcao para saber o status do servico - Mike 26/02/2020
window.FMARK.isConnected = function (done) {
  const isConnected = document.querySelector('*[data-icon="alert-phone"]') !== null ? false : true;

  if (done !== undefined) done(isConnected);
  SetConsoleMessage("GetCheckIsConnected", JSON.stringify(isConnected));
  return isConnected;
};

window.FMARK.teste = function (url) {
  var lUrl = window.Store.ProfilePicThumb._index[url].__x_imgFull;
  convertImgToBase64URL(lUrl, function (base64Img) {
    SetConsoleMessage("GetProfilePicThumb", JSON.stringify(base64Img));
  });
};

window.FMARK.getProfilePicFromServer = function (id) {
  return Store.WapQuery.profilePicFind(id).then((x) => console.log(x.eurl));
};

window.FMARK.getProfilePicSmallFromId = async function (id) {
  return await window.Store.ProfilePicThumb.find(id).then(
    async (d) => {
      if (d.img !== undefined) {
        return await window.FMARK.downloadFileWithCredentials(d.img);
      } else {
        return false;
      }
    },
    function (e) {
      return false;
    },
  );
};

// ================== MESSAGE PROCESSING ==================
window.FMARK.processMessageObj = function (messageObj, includeMe, includeNotifications) {
  if (messageObj.isNotification) {
    if (includeNotifications) return FMARK._serializeMessageObj(messageObj);
    else return;
    // System message
    // (i.e. "Messages you send to this chat and calls are now secured with end-to-end encryption...")
  } else if (messageObj.id.fromMe === false || includeMe) {
    return FMARK._serializeMessageObj(messageObj);
  }

  SetConsoleMessage("processMessageObj", JSON.stringify(messageObj));
  return;
};

window.FMARK.getAllMessagesInChat = function (id, includeMe, includeNotifications, done) {
  const chat = FMARK.getChat(id);
  let output = [];
  if (!chat || !chat.msgs) {
    if (done !== undefined) done(output);
    return output;
  }
  const messages = chat.msgs._models || [];

  for (const i in messages) {
    if (i === "remove") {
      continue;
    }
    const messageObj = messages[i];

    //Miro Emidio - 05/Dez/2019 Alterado para funcionamento em WHATS empresarial/pessoal
    let message = FMARK.processMessageObj(messageObj, includeMe, false); //includeNotifications
    if (message) output.push(message);
  }
  if (done !== undefined) done(output);
  return output;
};

window.FMARK.getAllMessagesInChatAsync = async function (id, includeMe, includeNotifications, done) {
  const chat = await Store.FindChat.findExistingChat(Store.WidFactory.createWid(id));
  let output = [];
  if (!chat || !chat.msgs) {
    if (done !== undefined) done(output);
    return output;
  }
  const messages = chat.msgs._models || [];

  for (const i in messages) {
    if (i === "remove") {
      continue;
    }
    const messageObj = messages[i];

    //Miro Emidio - 05/Dez/2019 Alterado para funcionamento em WHATS empresarial/pessoal
    let message = FMARK.processMessageObj(messageObj, includeMe, false); //includeNotifications
    if (message) output.push(message);
  }
  if (done !== undefined) done(output);
  return output;
};

window.FMARK.getAllMessageIdsInChat = function (id, includeMe, includeNotifications, done) {
  const chat = FMARK.getChat(id);
  let output = [];
  if (!chat || !chat.msgs) {
    if (done !== undefined) done(output);
    return output;
  }
  const messages = chat.msgs._models || [];

  for (const i in messages) {
    if (i === "remove" || (!includeMe && messages[i].isMe) || (!includeNotifications && messages[i].isNotification)) {
      continue;
    }
    output.push(messages[i].id._serialized);
  }
  if (done !== undefined) done(output);
  return output;
};

window.FMARK.getMessageById = function (id, done) {
  let result = false;
  try {
    let msg = window.Store.Msg.get(id);
    if (msg) {
      result = FMARK.processMessageObj(msg, true, true);
    }
  } catch (err) {}

  if (done !== undefined) {
    done(result);
  } else {
    return result;
  }
};

window.FMARK.getLastMessagesMD = async function (chatId, limit = 30) {
  try {
    // Garante o sufixo correto
    if (!chatId.endsWith("@c.us") && !chatId.endsWith("@g.us")) {
      chatId += "@c.us";
    }

    // Busca mensagens
    const messages = await window.FMARK.getMessagesMD(chatId, {
      count: limit,
      direction: "before",
    });

    // Processa rich_response se existir
    return messages
      .filter((m) => m && typeof m === "object")
      .map((m) => {
        let body = m.body || "";

        if (m.type === "rich_response" && m.richResponse) {
          body = m.richResponse.fragments.map((f) => f.text).join("");
        }

        return {
          Id: m.id?._serialized || "",
          FromMe: !!m.id?.fromMe,
          Body: body,
          Timestamp: m.t || 0,
          Type: m.type || "",
        };
      });
  } catch (error) {
    console.error("Erro ao buscar mensagens:", error);
    return [];
  }
};

window.FMARK.getLastMessages = function (chatId, limit = 30) {
  // Garante o sufixo @c.us ou @g.us
  if (!chatId.endsWith("@c.us") && !chatId.endsWith("@g.us")) {
    chatId += "@c.us";
  }

  // Obtém o chat
  const chat = window.Store?.Chat?.get(chatId);
  if (!chat) return false;

  window.FMARK.openChat(chatId);

  // Pega as últimas mensagens (slice negativo pega do final)
  const allMsgs = chat.msgs.serialize();
  const lastMsgs = allMsgs.slice(-limit); // ← ÚLTIMAS MENSAGENS

  // Mapeia para o formato desejado
  return lastMsgs.map((m) => ({
    Id: m.id?._serialized || "",
    FromMe: !!m.id?.fromMe,
    Body: m.body || "",
    Timestamp: m.t || 0, // epoch-seconds
  }));
};

// ================== MESSAGE SENDING ==================
window.FMARK.ReplyMessage = function (idMessage, message, done) {
  var messageObject = window.Store.Msg.get(idMessage);
  if (messageObject === undefined) {
    if (done !== undefined) done(false);
    return false;
  }
  messageObject = messageObject.value();

  const chat = FMARK.getChat(messageObject.chat.id);
  if (chat !== undefined) {
    if (done !== undefined) {
      chat.sendMessage(message, null, messageObject).then(function () {
        function sleep(ms) {
          return new Promise((resolve) => setTimeout(resolve, ms));
        }

        var trials = 0;

        function check() {
          for (let i = chat.msgs.models.length - 1; i >= 0; i--) {
            let msg = chat.msgs.models[i];

            if (!msg.senderObj.isMe || msg.body != message) {
              continue;
            }
            done(FMARK._serializeMessageObj(msg));
            return True;
          }
          trials += 1;
          console.log(trials);
          if (trials > 30) {
            done(true);
            return;
          }
          sleep(500).then(check);
        }
        check();
      });
      return true;
    } else {
      chat.sendMessage(message, null, messageObject);
      return true;
    }
  } else {
    if (done !== undefined) done(false);
    return false;
  }
};

//Funcao desativada em 27/11/2019 by Mike
/*window.FMARK.sendMessageToID = function (id, message, done) {
try {
window.getContact = (id) => {
return Store.WapQuery.queryExist(id);
}
window.getContact(id).then(contact => {
if (contact.status === 404) {
done(true);
} else {
Store.FindChat.findOrCreateLatestChat(contact.jid).then(chat => {
chat.sendMessage(message);
return true;
}).catch(reject => {
if (FMARK.sendMessage(id, message)) {
done(true);
return true;
}else{
done(false);
return false;
}
});
}
});
} catch (e) {
if (window.Store.Chat.length === 0)
return false;

firstChat = Store.Chat.models[0];
var originalID = firstChat.id;
firstChat.id = typeof originalID === "string" ? id : new window.Store.UserConstructor(id, { intentionallyUsePrivateConstructor: true });
if (done !== undefined) {
firstChat.sendMessage(message).then(function () {
firstChat.id = originalID;
done(true);
});
return true;
} else {
firstChat.sendMessage(message);
firstChat.id = originalID;
return true;
}
}
if (done !== undefined) done(false);
return false;
} */

window.FMARK.sendMessage = async function (id, message, done) {
  try {
    // Preparar o ID e buscar/criar o chat
    id = typeof id == "string" ? id : id._serialized;
    const getLid = await window.FMARK.getLidFromPhoneID(id);
    const resolvedId = getLid || id;
    if (!resolvedId) {
      if (done !== undefined) done(false);
      return false;
    }
    const userWid = Store.WidFactory.createWid(resolvedId);
    const origin = "username_contactless_search";
    const findOpts = { forceUsync: true };

    const { created, chat } = await Store.FindChat.findOrCreateLatestChat(userWid, origin, findOpts);

    if (!chat) {
      if (done !== undefined) done(false);
      return false;
    }

    // Adicionar método sendMessage se não existir
    if (!chat.sendMessage) {
      chat.sendMessage = function () {
        if (window.Store && window.Store.SendTextMsgToChat) {
          return window.Store.SendTextMsgToChat(this, ...arguments);
        }
        if (window.Store && window.Store.sendMessage) {
          return window.Store.sendMessage.apply(this, arguments);
        }
      };
    }

    if (done !== undefined) {
      await chat.sendMessage(message);

      function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
      }

      var trials = 0;

      async function check() {
        for (let i = chat.msgs.models.length - 1; i >= 0; i--) {
          let msg = chat.msgs.models[i];
          if (!msg.senderObj.isMe || msg.body != message) {
            continue;
          }
          done(FMARK._serializeMessageObj(msg));
          return true;
        }

        trials += 1;
        console.log(trials);

        if (trials > 30) {
          done(true);
          return;
        }

        await sleep(500);
        await check();
      }

      await check();
      return true;
    } else {
      await chat.sendMessage(message);
      return true;
    }
  } catch (error) {
    console.error("Error in sendMessage:", error);
    if (done !== undefined) done(false);
    return false;
  }
};

window.FMARK.sendMessage2 = async function (id, message, done) {
  try {
    // Preparar o ID e buscar/criar o chat
    id = typeof id == "string" ? id : id._serialized;
    const getLid = await window.FMARK.getLidFromPhoneID(id);
    const resolvedId = getLid || id;
    if (!resolvedId) {
      if (done !== undefined) done(false);
      return false;
    }
    const userWid = Store.WidFactory.createWid(resolvedId);
    const origin = "username_contactless_search";
    const findOpts = { forceUsync: true };

    const { created, chat } = await Store.FindChat.findOrCreateLatestChat(userWid, origin, findOpts);

    if (!chat) {
      if (done !== undefined) done(false);
      return false;
    }

    // Adicionar método sendMessage se não existir
    if (!chat.sendMessage) {
      chat.sendMessage = function () {
        if (window.Store && window.Store.SendTextMsgToChat) {
          return window.Store.SendTextMsgToChat(this, ...arguments);
        }
        if (window.Store && window.Store.sendMessage) {
          return window.Store.sendMessage.apply(this, arguments);
        }
      };
    }

    if (done !== undefined) {
      await chat.sendMessage(message);
      done(true);
    } else {
      await chat.sendMessage(message);
    }

    return true;
  } catch (error) {
    console.error("Error in sendMessage2:", error);
    if (done !== undefined) done(false);
    return false;
  }
};

/**
 * Envia mensagem de texto (com menções, link preview e botões).
 *
 * @example
 * ```js
 * await FMARK.sendTextMessage('5511999999999@c.us', 'Olá');
 *
 * // Botões (quick reply)
 * await FMARK.sendTextMessage('5511999999999@c.us', 'Escolha:', {
 *   title: 'Menu',
 *   footer: 'Selecione',
 *   buttons: [{ id: '1', text: 'OK' }, { id: '2', text: 'Cancelar' }],
 * });
 * ```
 *
 * @param {string} chatId `...@c.us`, `...@g.us` ou `...@lid`.
 * @param {string} content Texto da mensagem.
 * @param {object} [options] Opções de envio (menções, preview, botões, etc).
 * @returns {Promise<false|{id:any,ack:any,from:any,to:any,sendMsgResult:any}>} Retorno compatível.
 */
window.FMARK.sendTextMessage = async function (chatId, content, options = {}) {
  try {
    const defaults = {
      detectMentioned: true,
      linkPreview: true,
      markIsRead: true,
      waitForAck: true,
      delay: 0,
    };
    options = { ...defaults, ...options };

    const getLid = await window.FMARK.getLidFromPhoneID(chatId);
    const resolvedId = getLid || (typeof chatId === "string" ? chatId : chatId?._serialized);
    if (!resolvedId) {
      return false;
    }
    const userWid = Store.WidFactory.createWid(resolvedId);
    const origin = options.origin || "username_contactless_search";
    const findOpts = { forceUsync: true };

    const { chat } = await Store.FindChat.findOrCreateLatestChat(userWid, origin, findOpts);
    const targetChat = chat ?? Store.Chat.get(userWid);

    if (!targetChat) {
      return false;
    }

    if (options.delay && options.delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, options.delay));
    }

    if (options.markIsRead && Store.ReadSeen?.sendSeen) {
      try {
        await Store.ReadSeen.sendSeen({targetChat});
      } catch {}
    }

    let body = content == null ? "" : String(content);

    if (options.detectMentioned) {
      let mentioned = [];
      const toMentionWid = (id) => {
        try {
          if (!id) return null;
          if (typeof id === "string") {
            const s = id.trim();
            if (!s) return null;
            if (s.includes("@")) return Store.WidFactory.createWid(s);
            if (Store.WidFactory.createUserWid) return Store.WidFactory.createUserWid(s);
            return Store.WidFactory.createWid(`${s}@c.us`);
          }
          if (id._serialized) return Store.WidFactory.createWid(id._serialized);
          if (id.toString && typeof id.toString === "function") {
            const s = id.toString();
            if (s && typeof s === "string" && s.includes("@")) return Store.WidFactory.createWid(s);
          }
        } catch {}
        return null;
      };

      if (Array.isArray(options.listMention)) {
        mentioned = options.listMention.map((id) => toMentionWid(id)).filter(Boolean);
      } else {
        const ids = body.match(/(?<=@)(\d+)\b/g) || [];
        mentioned = ids.map((id) => Store.WidFactory.createWid(`${id}@c.us`));
        if (options.oculteMembers) {
          body = body.replace(/@\d+\b/g, "");
        }
      }

      if (mentioned.length) {
        options.mentionedJidList = mentioned;
      }
    }

    const fromWid = await Store.UserPrefs.getMaybeMePnUser();
    const msgId = await window.FMARK.generateMessageID(targetChat.id._serialized);
    const now = Math.floor(Date.now() / 1000);
    const eph =
      Store.EphemeralFields && Store.EphemeralFields.getEphemeralFields
        ? Store.EphemeralFields.getEphemeralFields(targetChat)
        : {};

    let rawMessage = {
      id: msgId,
      ack: 1,
      from: fromWid,
      to: userWid,
      local: true,
      self: "out",
      t: now,
      isNewMsg: true,
      type: "chat",
      body: body,
      subtype: null,
      urlText: null,
      urlNumber: null,
      ...eph,
    };

    if (options.mentionedJidList) {
      rawMessage.mentionedJidList = options.mentionedJidList;
    }

    rawMessage = prepareMessageButtons(rawMessage, options);
    rawMessage = await prepareLinkPreview(rawMessage, options);

    if (targetChat.id.isBot && targetChat.id.isBot()) {
      rawMessage = {
        ...rawMessage,
        messageSecret: await Store.genBotMsgSecretFromMsgSecret(crypto.getRandomValues(new Uint8Array(32))),
        botPersonaId: Store.BotProfileCollection.get(targetChat.id.toString())?.personaId,
      };
    }

    const result = await Store.addAndSendMsgToChat(targetChat, rawMessage);

    let sendMsgResult = null;
    if (options.waitForAck && result && result[1]) {
      try {
        sendMsgResult = await result[1];
      } catch {}
    }

    const message = result?.[0] || null;
    return {
      id: message?.id?.toString?.() || rawMessage.id?.toString?.() || rawMessage.id,
      ack: message?.ack,
      from: fromWid?.toString?.() || fromWid,
      to: targetChat.id?.toString?.() || userWid,
      sendMsgResult,
    };
  } catch (error) {
    console.error("Error in sendTextMessage:", error);
    return false;
  }
};

// ================== FMARK EQUIVALENTS (WPP FEATURES) ==================
async function fmarkEnsureChatById(chatId, origin = "username_contactless_search") {
  const resolved = await window.FMARK.getLidFromPhoneID(chatId);
  const raw = resolved || (typeof chatId === "string" ? chatId : chatId?._serialized || chatId);
  const wid = fmarkEnsureWid(raw);
  if (!wid || !Store.FindChat?.findOrCreateLatestChat) {
    return Store.Chat?.get(wid) || Store.Chat?.get(raw) || null;
  }
  try {
    const result = await Store.FindChat.findOrCreateLatestChat(wid, origin, { forceUsync: true });
    return result?.chat || Store.Chat?.get(wid) || Store.Chat?.get(raw) || null;
  } catch {
    return Store.Chat?.get(wid) || Store.Chat?.get(raw) || null;
  }
}

/**
 * Retorna o WID do usuÃ¡rio atual.
 *
 * @example
 * ```js
 * const me = FMARK.getMyUserId();
 * console.log(me?.user);
 * ```
 */
window.FMARK.getMyUserId = function () {
  try {
    if (Store.UserPrefs?.getMaybeMePnUser) return Store.UserPrefs.getMaybeMePnUser();
  } catch {}
  try {
    return Store.Conn?.wid || Store.Me?.wid || null;
  } catch {}
  return null;
};

/**
 * Lista chats com filtros (equivalente ao WPP.chat.list).
 *
 * @example
 * ```js
 * const chats = await FMARK.listChats({ onlyGroups: true });
 * ```
 */
window.FMARK.listChats = async function (options = {}) {
  const count = options.count == null ? Infinity : options.count;
  const direction = options.direction === "before" ? "before" : "after";

  let models = Store.Chat?.getModelsArray ? Store.Chat.getModelsArray().slice() : (Store.Chat?._models || []).slice();

  const boolProp = (obj, key) => {
    const v = obj?.[key];
    return typeof v === "function" ? !!v.call(obj) : !!v;
  };

  if (options.onlyUsers) models = models.filter((c) => (typeof c.isUser === "function" ? c.isUser() : c.isUser));
  if (options.onlyGroups) models = models.filter((c) => (typeof c.isGroup === "function" ? c.isGroup() : c.isGroup));
  if (options.onlyCommunities) {
    models = models.filter(
      (c) => (typeof c.isGroup === "function" ? c.isGroup() : c.isGroup) && c.groupMetadata?.groupType === "COMMUNITY"
    );
  }
  if (options.onlyWithUnreadMessage) models = models.filter((c) => boolProp(c, "hasUnread"));
  if (options.onlyArchived) models = models.filter((c) => boolProp(c, "archive"));

  if (options.withLabels && Store.tagsLabels) {
    const ids = options.withLabels.map((value) => {
      try {
        const label = Store.tagsLabels.findFirst ? Store.tagsLabels.findFirst((l) => l.name === value) : null;
        return label ? label.id : value;
      } catch {
        return value;
      }
    });
    models = models.filter((c) => Array.isArray(c.labels) && c.labels.some((id) => ids.includes(id)));
  }

  const indexChat = options?.id ? Store.Chat.get(options.id) : null;
  const startIndex = indexChat ? models.indexOf(indexChat) : 0;

  if (direction === "before") {
    const fixStartIndex = startIndex - count < 0 ? 0 : startIndex - count;
    const fixEndIndex = fixStartIndex + count >= startIndex ? startIndex : fixStartIndex + count;
    models = models.slice(fixStartIndex, fixEndIndex);
  } else {
    models = models.slice(startIndex, startIndex + count);
  }

  for (const chat of models) {
    if (chat.isGroup) {
      try {
        await Store.GroupMetadata.find(chat.id);
      } catch {}
    }
  }

  return models;
};

/**
 * Envia enquete (equivalente ao WPP.chat.sendCreatePollMessage).
 *
 * @example
 * ```js
 * await FMARK.sendCreatePollMessage('5511999999999@c.us', 'Qual?', ['A', 'B'], { selectableCount: 1 });
 * ```
 */
window.FMARK.sendCreatePollMessage = async function (chatId, pollName, choices, options = {}) {
  const list = Array.isArray(choices) ? choices : [];
  const selectableCount = options.selectableCount ?? 0;
  return window.FMARK.sendPoolTeste(chatId, pollName, list, selectableCount);
};

/**
 * Função isolada para envio de enquete. Se der bug, pode remover ou alterar só esta chamada.
 * Usa o módulo oficial WAWebPollsSendPollCreationMsgAction.sendPollCreation quando disponível; senão fallback manual.
 * Usada por sendCreatePollMessage e pelo ramo options.pool do sendMessageMD.
 *
 * @param {string} chatId - ID do chat (ex: '5511999999999@c.us' ou grupo @g.us)
 * @param {string} pollName - Título da enquete
 * @param {Array<string|{name:string}>} pollList - Opções da enquete
 * @param {number} [selectableCount=0] - Quantidade de opções selecionáveis (0 = uma só)
 * @returns {Promise<false|true|object>}
 */
window.FMARK.sendPoolTeste = async function (chatId, pollName, pollList, selectableCount = 0) {
  const getLid = await window.FMARK.getLidFromPhoneID(chatId);
  const resolvedId = getLid || (typeof chatId === "string" ? chatId : chatId?._serialized);
  if (!resolvedId) {
    return false;
  }
  const userWid = Store.WidFactory.createWid(resolvedId);
  const origin = "username_contactless_search";
  const isGroup = resolvedId.endsWith("@g.us");
  const findOpts = isGroup ? {} : { forceUsync: true };
  const { chat } = await Store.FindChat.findOrCreateLatestChat(userWid, origin, findOpts);
  const targetChat = chat;
  if (!targetChat) {
    return false;
  }
  const prepareAction = window.Store?.PrepareMessageSendingAction?.prepareChatForMessageSending;
  const hasPrepareMessage = typeof prepareAction === "function";
  if (hasPrepareMessage && targetChat && typeof targetChat === "object") {
    try {
      targetChat.__x_chatEntryPoint = "Chatlist";
    } catch (_) {}
  }
  if (hasPrepareMessage) {
    try {
      await prepareAction(targetChat);
    } catch (_) {}
  }
  const trim = (s) => (typeof s === "string" ? s.trim() : s);
  const name = trim(pollName) || "";
  const optionsForAction = (Array.isArray(pollList) ? pollList : []).map((opt) => ({
    name: trim(typeof opt === "string" ? opt : opt?.name || ""),
  }));
  const PollsAction = window.Store?.PollsSendPollCreationMsgAction;
  if (PollsAction && typeof PollsAction.sendPollCreation === "function" && Store.PollCreationUtils) {
    try {
      const poll = {
        name,
        options: optionsForAction,
        selectableOptionsCount: Math.max(0, selectableCount | 0),
        contentType: Store.PollCreationUtils.PollContentType.TEXT,
        pollType: Store.PollCreationUtils.PollType.POLL,
      };
      const results = await PollsAction.sendPollCreation({ poll, chat: targetChat });
      if (Array.isArray(results) && results[1]?.messageSendResult) {
        const status = String(results[1].messageSendResult).toLowerCase();
        if (status === "success" || status === "ok") {
          return results[0] || true;
        }
      }
      return false;
    } catch (err) {
      console.warn("[FMARK] sendPoolTeste via PollsSendPollCreationMsgAction failed, using fallback:", err);
    }
  }
  let fromWid = await Store.UserPrefs.getMaybeMePnUser();
  if (Store.LidMigrationUtils && typeof Store.LidMigrationUtils.getMeUserLidOrJidForChat === "function") {
    try {
      const lidOrJid = Store.LidMigrationUtils.getMeUserLidOrJidForChat(targetChat);
      if (lidOrJid) fromWid = lidOrJid;
    } catch (_) {}
  }
  const msgId = await window.FMARK.generateMessageID(targetChat.id._serialized, fromWid);
  const now = Math.floor(Date.now() / 1000);
  const eph =
    Store.EphemeralFields && Store.EphemeralFields.getEphemeralFields
      ? Store.EphemeralFields.getEphemeralFields(targetChat)
      : {};
  const optionsArr = optionsForAction.map((opt, idx) => ({ name: opt.name, localId: idx }));
  const content = {
    type: "poll_creation",
    kind: "pollCreation",
    viewMode: (Store.ViewMode && Store.ViewMode.ViewModeType && Store.ViewMode.ViewModeType.VISIBLE) || "VISIBLE",
    isWamoSub: false,
    pollName: name,
    pollOptions: optionsArr,
    pollSelectableOptionsCount: Math.max(0, selectableCount | 0),
    messageSecret: crypto.getRandomValues(new Uint8Array(32)),
  };
  if (Store.PollCreationUtils) {
    if (Store.PollCreationUtils.PollContentType) content.pollContentType = Store.PollCreationUtils.PollContentType.TEXT;
    if (Store.PollCreationUtils.PollType) content.pollType = Store.PollCreationUtils.PollType.POLL;
  }
  const message = {
    id: msgId,
    ack: 0,
    from: fromWid,
    to: userWid,
    local: true,
    t: now,
    isNewMsg: true,
    ...content,
    ...eph,
  };
  const results = await Promise.all(window.Store.addAndSendMsgToChat(targetChat, message));
  if (Array.isArray(results) && results[1]?.messageSendResult) {
    const status = results[1].messageSendResult.toLowerCase();
    if (status === "success" || status === "ok") {
      return results[0] || true;
    }
  }
  return false;
};

// ==================== VOIP / CALL FUNCTIONS ====================

/**
 * Garante que os módulos de VoIP/Call estão carregados no Store via importNamespace.
 * Chamado automaticamente pelas funções de chamada.
 * @private
 */
window.FMARK._ensureCallModules = function () {
  const g = self || window;
  if (!g.importNamespace) return;
  if (!window.Store) window.Store = {};
  const S = window.Store;
  if (!S.CallCollection) {
    try {
      const mod = g.importNamespace("WAWebCallCollection");
      if (mod) {
        const resolved = mod.default || mod;
        if (resolved && (typeof resolved.processIncomingCall === "function" || typeof resolved.setActiveCall === "function")) {
          S.CallCollection = resolved;
        }
      }
    } catch (_) {}
  }
  if (!S.VoipWaCallEnums) {
    try {
      const mod = g.importNamespace("WAWebVoipWaCallEnums");
      if (mod && mod.CallState) {
        S.VoipWaCallEnums = mod;
      }
    } catch (_) {}
  }
  if (!S.VoipGatingUtils) {
    try {
      const mod = g.importNamespace("WAWebVoipGatingUtils");
      if (mod && typeof mod.isCallingEnabled === "function") {
        S.VoipGatingUtils = mod;
      }
    } catch (_) {}
  }
  if (!S.VoipBackendLoadable) {
    try {
      const mod = g.importNamespace("WAWebVoipBackendLoadable");
      if (mod && typeof mod.requireVoipJsBackend === "function") {
        S.VoipBackendLoadable = mod;
      }
    } catch (_) {}
  }
  if (!S.VoipStartCall) {
    try {
      const mod = g.importNamespace("WAWebVoipStartCall");
      if (mod) S.VoipStartCall = mod;
    } catch (_) {}
  }
  if (!S.CallModel) {
    try {
      const mod = g.importNamespace("WAWebCallModel");
      if (mod && mod.default) S.CallModel = mod.default;
    } catch (_) {}
  }
};

/**
 * Carrega o backend VoIP do WhatsApp Web (lazy modules).
 * Retorna { WAWebVoipInit, WAWebHandleVoipCallOffer } ou null.
 * @returns {Promise<object|null>}
 */
window.FMARK._loadVoipBackend = async function () {
  try {
    const loadable = window.Store?.VoipBackendLoadable;
    if (loadable && typeof loadable.requireVoipJsBackend === "function") {
      const backend = await loadable.requireVoipJsBackend();
      return backend || null;
    }
    const g = self || window;
    if (g.importNamespace) {
      try {
        const mod = g.importNamespace("WAWebVoipBackendLoadable");
        if (mod && typeof mod.requireVoipJsBackend === "function") {
          return await mod.requireVoipJsBackend();
        }
      } catch (_) {}
    }
  } catch (err) {
    console.warn("[FMARK] _loadVoipBackend failed:", err);
  }
  return null;
};

/**
 * Obtém o módulo WAWebVoipStartCall em runtime (lazy loaded).
 * @returns {object|null}
 */
window.FMARK._getVoipStartCall = function () {
  if (window.Store?.VoipStartCall) return window.Store.VoipStartCall;
  const g = self || window;
  try {
    if (g.importNamespace) {
      const mod = g.importNamespace("WAWebVoipStartCall");
      if (mod) {
        window.Store.VoipStartCall = mod;
        return mod;
      }
    }
  } catch (_) {}
  return null;
};

/**
 * Inicia uma chamada de voz ou vídeo nativa do WhatsApp Web.
 *
 * @param {string} chatId - ID do chat destino (ex: '5511999999999@c.us')
 * @param {object} [options={}] - Opções da chamada
 * @param {boolean} [options.isVideo=false] - true para videochamada, false para voz
 * @param {function} [options.onStateChange] - Callback chamado quando o estado da chamada muda. Recebe (callState, callModel).
 * @param {function} [options.onAnswer] - Callback chamado quando a pessoa atende (CallActive). Recebe (callModel).
 * @param {function} [options.onEnd] - Callback chamado quando a chamada termina. Recebe (callModel).
 * @param {string|Blob|ArrayBuffer} [options.audioToSend] - Se fornecido, envia um áudio PTT no chat quando a pessoa atender.
 * @param {boolean} [options.endAfterAudio=false] - Se true, encerra a chamada após enviar o áudio.
 * @returns {Promise<{success: boolean, callId?: string, error?: string}>}
 *
 * @example
 * // Chamada de voz simples
 * await FMARK.startCall('5511999999999@c.us');
 *
 * // Videochamada com callbacks
 * await FMARK.startCall('5511999999999@c.us', {
 *   isVideo: true,
 *   onAnswer: (call) => console.log('Atendeu!', call),
 *   onEnd: (call) => console.log('Encerrou', call),
 * });
 *
 * // Chamada que envia áudio quando atender
 * await FMARK.startCall('5511999999999@c.us', {
 *   onAnswer: (call) => {
 *     FMARK.sendMessageMD('5511999999999@c.us', '', { ptt: true, audioUrl: 'https://...' });
 *   },
 * });
 */
window.FMARK.startCall = async function (chatId, options = {}) {
  window.FMARK._ensureCallModules();
  const isVideo = !!options.isVideo;
  const onStateChange = typeof options.onStateChange === "function" ? options.onStateChange : null;
  const onAnswer = typeof options.onAnswer === "function" ? options.onAnswer : null;
  const onEnd = typeof options.onEnd === "function" ? options.onEnd : null;
  const endAfterAudio = !!options.endAfterAudio;
  const gating = window.Store?.VoipGatingUtils;
  if (gating && typeof gating.isCallingEnabled === "function" && !gating.isCallingEnabled()) {
    console.warn("[FMARK] startCall: isCallingEnabled() returned false, forcing enable via AB prop...");
    try {
      const g = self || window;
      if (g.importNamespace) {
        const abProps = g.importNamespace("WAWebABProps");
        if (abProps && typeof abProps.getABPropConfigValue === "function" && !abProps.getABPropConfigValue.__fmarkCallPatched) {
          const origAB = abProps.getABPropConfigValue;
          abProps.getABPropConfigValue = function (...args) {
            if (args[0] === "enable_web_calling") return true;
            return origAB.apply(this, args);
          };
          abProps.getABPropConfigValue.__fmarkCallPatched = true;
        }
      }
    } catch (_) {}
  }
  const rawId = typeof chatId === "string" ? chatId : chatId?._serialized;
  if (!rawId) {
    return { success: false, error: "invalid_chat_id" };
  }
  const isGroup = rawId.endsWith("@g.us");
  let peerJid = null;
  let chat = null;
  try {
    chat = Store.Chat?.get(rawId);
  } catch (_) {}
  if (!chat) {
    try {
      const wid = Store.WidFactory.createWid(rawId);
      chat = Store.Chat?.get(wid);
    } catch (_) {}
  }
  if (!chat) {
    const getLid = await window.FMARK.getLidFromPhoneID(chatId);
    if (getLid && getLid !== rawId) {
      try { chat = Store.Chat?.get(getLid); } catch (_) {}
      if (!chat) {
        try {
          const lidWid = Store.WidFactory.createWid(getLid);
          chat = Store.Chat?.get(lidWid);
        } catch (_) {}
      }
    }
  }
  if (!chat) {
    const strategies = isGroup ? [{}] : [{ forceUsync: false }, {}];
    for (const opts of strategies) {
      try {
        const wid = Store.WidFactory.createWid(rawId);
        const result = await Store.FindChat.findOrCreateLatestChat(wid, "username_contactless_search", opts);
        if (result?.chat) { chat = result.chat; break; }
      } catch (err) {
        console.warn("[FMARK] startCall: findOrCreate failed:", err?.message);
      }
    }
  }
  if (chat && chat.id) {
    peerJid = chat.id;
    console.log("[FMARK] startCall: resolved peerJid from chat:", peerJid?._serialized || peerJid);
  } else {
    peerJid = Store.WidFactory.createWid(rawId);
    console.log("[FMARK] startCall: using raw WID as peerJid (no chat found):", peerJid?._serialized || rawId);
  }
  const cc = window.Store?.CallCollection || window.Store?.CallStore;
  const callEventPromise = new Promise((resolve) => {
    if (!cc || typeof cc.on !== "function") { resolve(null); return; }
    let resolved = false;
    const done = (callModel) => {
      if (resolved) return;
      if (callModel && callModel.id) {
        resolved = true;
        try { cc.off("add", onAdd); } catch (_) {}
        try { cc.off("change:activeCall", onActive); } catch (_) {}
        resolve(callModel);
      }
    };
    const onAdd = (m) => done(m);
    const onActive = (m) => done(m);
    cc.on("add", onAdd);
    cc.on("change:activeCall", onActive);
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try { cc.off("add", onAdd); } catch (_) {}
        try { cc.off("change:activeCall", onActive); } catch (_) {}
        resolve(null);
      }
    }, 10000);
  });
  const voipBackend = await window.FMARK._loadVoipBackend();
  if (!voipBackend) {
    console.warn("[FMARK] startCall: VoIP backend not loaded, trying callOffer fallback...");
  }
  let callStarted = false;
  let nativeCallResult = null;
  const startCallMod = window.FMARK._getVoipStartCall();
  if (startCallMod) {
    const fnNames = ["startWAWebVoipCall", "startCall", "default"];
    let startCallFn = null;
    for (const name of fnNames) {
      if (typeof startCallMod[name] === "function") {
        startCallFn = startCallMod[name];
        console.log("[FMARK] startCall: using VoipStartCall." + name);
        break;
      }
    }
    if (!startCallFn && typeof startCallMod === "function") {
      startCallFn = startCallMod;
      console.log("[FMARK] startCall: using VoipStartCall as direct function");
    }
    if (startCallFn) {
      try {
        nativeCallResult = await startCallFn(peerJid, isVideo);
        callStarted = true;
        console.log("[FMARK] startCall: native call initiated, result:", nativeCallResult);
      } catch (err) {
        console.warn("[FMARK] startCall: native startCall failed:", err?.message || err);
      }
    } else {
      console.warn("[FMARK] startCall: VoipStartCall module keys:", Object.keys(startCallMod));
    }
  }
  if (!callStarted) {
    console.log("[FMARK] startCall: falling back to callOffer (wa-js style)...");
    try {
      const offerResult = await window.FMARK.callOffer(resolvedId, { isVideo });
      if (offerResult && offerResult.id) {
        console.log("[FMARK] startCall: callOffer succeeded, callId:", offerResult.id);
        const existingCallId = offerResult.id;
        if (onStateChange || onAnswer || onEnd) {
          window.FMARK._monitorCallState(chatId, { callId: existingCallId, onStateChange, onAnswer, onEnd, endAfterAudio });
        }
        return { success: true, callId: existingCallId };
      }
      callStarted = !!offerResult;
    } catch (err) {
      console.error("[FMARK] startCall: callOffer also failed:", err?.message || err);
      return { success: false, error: "all_call_methods_failed" };
    }
  }
  if (!callStarted) {
    return { success: false, error: "call_not_started" };
  }
  let callId = null;
  const findCallId = () => {
    const cNow = window.Store?.CallCollection || window.Store?.CallStore;
    if (!cNow) return null;
    if (cNow.activeCall?.id) return cNow.activeCall.id;
    if (cNow.lastActiveCall?.id) return cNow.lastActiveCall.id;
    const tryModels = (arr) => {
      if (!arr || !arr.length) return null;
      for (let j = arr.length - 1; j >= 0; j--) {
        const m = arr[j];
        if (m && m.id) return m.id;
      }
      return null;
    };
    if (typeof cNow.getModelsArray === "function") {
      const r = tryModels(cNow.getModelsArray());
      if (r) return r;
    }
    if (cNow._models) {
      const r = tryModels(cNow._models);
      if (r) return r;
    }
    if (cNow.models) {
      const r = tryModels(cNow.models);
      if (r) return r;
    }
    return null;
  };
  if (nativeCallResult && typeof nativeCallResult === "object" && nativeCallResult.id) {
    callId = nativeCallResult.id;
    console.log("[FMARK] startCall: callId from native return:", callId);
  }
  if (!callId) {
    callId = findCallId();
    if (callId) console.log("[FMARK] startCall: callId from Store (immediate):", callId);
  }
  if (!callId) {
    const eventCall = await callEventPromise;
    if (eventCall?.id) {
      callId = eventCall.id;
      console.log("[FMARK] startCall: callId via event listener:", callId);
    }
  }
  if (!callId) {
    for (let attempt = 0; attempt < 20; attempt++) {
      await new Promise((r) => setTimeout(r, 300));
      callId = findCallId();
      if (callId) {
        console.log("[FMARK] startCall: callId via polling (attempt", attempt + 1, "):", callId);
        break;
      }
    }
  }
  if (!callId) {
    const cDebug = window.Store?.CallCollection || window.Store?.CallStore;
    console.warn("[FMARK] startCall: callId not determined.",
      "activeCall:", cDebug?.activeCall,
      "lastActiveCall:", cDebug?.lastActiveCall,
      "models:", typeof cDebug?.getModelsArray === "function" ? cDebug.getModelsArray() : cDebug?._models,
      "nativeResult:", nativeCallResult
    );
  }
  if (onStateChange || onAnswer || onEnd) {
    window.FMARK._monitorCallState(chatId, {
      callId,
      onStateChange,
      onAnswer,
      onEnd,
      endAfterAudio,
    });
  }
  return { success: true, callId: callId || "unknown" };
};

/**
 * Encerra a chamada ativa.
 * @returns {Promise<boolean>}
 */
window.FMARK.endCall = async function () {
  window.FMARK._ensureCallModules();
  try {
    const g = self || window;
    if (g.importNamespace) {
      try {
        const stackMod = g.importNamespace("WAWebVoipStackInterface");
        if (stackMod && typeof stackMod.getVoipStackInterface === "function") {
          const stack = await stackMod.getVoipStackInterface();
          if (stack && typeof stack.endCall === "function") {
            await stack.endCall("Normal", true);
            return true;
          }
        }
      } catch (_) {}
    }
    const callCollection = window.Store?.CallCollection || window.Store?.CallStore;
    if (window.Store?.CallUtils && typeof window.Store.CallUtils.sendCallEnd === "function") {
      const activeCall = callCollection?.activeCall;
      if (activeCall) {
        await window.Store.CallUtils.sendCallEnd(activeCall);
        return true;
      }
    }
    const activeCall = callCollection?.activeCall;
    if (activeCall && typeof activeCall.end === "function") {
      await activeCall.end();
      return true;
    }
  } catch (err) {
    console.warn("[FMARK] endCall error:", err);
  }
  return false;
};

/**
 * Retorna info da chamada ativa ou null.
 * @returns {object|null}
 */
window.FMARK.getActiveCall = function () {
  window.FMARK._ensureCallModules();
  const callCollection = window.Store?.CallCollection || window.Store?.CallStore;
  if (!callCollection) return null;
  const active = callCollection.activeCall;
  if (!active) return null;
  return {
    id: active.id,
    peerJid: active.peerJid ? (active.peerJid._serialized || String(active.peerJid)) : null,
    isVideo: !!active.isVideo,
    isGroup: !!active.isGroup,
    outgoing: !!active.outgoing,
    state: active.__x_state ?? active.state ?? null,
    offerTime: active.offerTime ?? null,
  };
};

/**
 * Monitora o estado de uma chamada em andamento.
 * @param {string} chatId - Chat da chamada
 * @param {object} opts - Callbacks
 * @private
 */
window.FMARK._monitorCallState = function (chatId, opts = {}) {
  const { callId, onStateChange, onAnswer, onEnd, endAfterAudio } = opts;
  window.FMARK._ensureCallModules();
  let CallEnums = window.Store?.VoipWaCallEnums;
  let callCollection = window.Store?.CallCollection || window.Store?.CallStore;
  if (!CallEnums && window.Store?.CALL_STATES) {
    CallEnums = { CallState: window.Store.CALL_STATES };
  }
  if (!CallEnums) {
    try {
      const g = self || window;
      if (g.importNamespace) {
        const mod = g.importNamespace("WAWebVoipWaCallEnums");
        if (mod && mod.CallState) CallEnums = mod;
      }
    } catch (_) {}
  }
  if (!callCollection || !CallEnums) {
    console.warn("[FMARK] _monitorCallState: modules missing. CC:", !!callCollection, "Enums:", !!CallEnums, "Store keys:", Object.keys(window.Store || {}));
    return;
  }
  const ACTIVE_STATE = CallEnums.CallState?.CallActive ?? CallEnums.CallState?.[6] ?? 6;
  const ENDING_STATE = CallEnums.CallState?.CallStateEnding ?? CallEnums.CallState?.[13] ?? 13;
  const NONE_STATE = CallEnums.CallState?.None ?? CallEnums.CallState?.[0] ?? 0;
  let answered = false;
  let ended = false;
  let lastState = null;
  const getCall = () => {
    const active = callCollection.activeCall;
    if (active) return active;
    if (callId && typeof callCollection.get === "function") {
      return callCollection.get(callId);
    }
    return null;
  };
  const getState = (call) => {
    if (!call) return null;
    if (typeof call.getState === "function") return call.getState();
    return call.__x_state ?? call.state ?? null;
  };
  const cleanup = () => {
    ended = true;
    clearInterval(checkInterval);
  };
  const checkInterval = setInterval(() => {
    const call = getCall();
    if (!call) {
      if (lastState !== null && !ended) {
        cleanup();
        if (onEnd) { try { onEnd(null); } catch (_) {} }
      }
      return;
    }
    const state = getState(call);
    if (state !== lastState) {
      lastState = state;
      if (onStateChange) {
        try { onStateChange(state, call); } catch (_) {}
      }
    }
    if (!answered && state === ACTIVE_STATE) {
      answered = true;
      if (onAnswer) {
        try { onAnswer(call); } catch (_) {}
      }
    }
    if (state === NONE_STATE || state === ENDING_STATE) {
      if (!ended) {
        cleanup();
        if (onEnd) { try { onEnd(call); } catch (_) {} }
      }
    }
  }, 400);
  setTimeout(() => {
    if (!ended) cleanup();
  }, 5 * 60 * 1000);
};

/**
 * Inicia chamada e envia mensagem no chat quando a pessoa atender.
 *
 * @param {string} chatId - ID do chat
 * @param {string} messageText - Texto a enviar quando atender
 * @param {object} [callOptions={}] - Opções da chamada (isVideo, etc)
 * @returns {Promise<{success: boolean, callId?: string, error?: string}>}
 *
 * @example
 * await FMARK.callAndSendMessage('5511999999999@c.us', 'Oi, atendeu!');
 */
window.FMARK.callAndSendMessage = async function (chatId, messageText, callOptions = {}) {
  return window.FMARK.startCall(chatId, {
    ...callOptions,
    onAnswer: async (call) => {
      try {
        await window.FMARK.sendMessageMD(chatId, messageText);
      } catch (err) {
        console.warn("[FMARK] callAndSendMessage: failed to send message on answer:", err);
      }
      if (callOptions.onAnswer) {
        try { callOptions.onAnswer(call); } catch (_) {}
      }
    },
  });
};

// ==================== AUDIO INJECTION INTO CALLS ====================
// WhatsApp Web usa WASM + createMediaStreamSource (fallback) para áudio de chamadas.
// Abordagem: usar <audio> element + createMediaElementSource para decodificar o áudio
// nativamente pelo browser, produzindo um MediaStreamTrack real.
// Hooks em getUserMedia, MediaStreamTrackProcessor e createMediaStreamSource garantem
// que o VoIP use nosso track em vez do microfone.

/**
 * Prepara uma fonte de áudio usando <audio> element + createMediaElementSource.
 * Isso usa o decoder nativo do browser (suporta OGG/Opus PTT, MP3, WAV, WebM, etc.)
 * e produz um MediaStreamTrack real com áudio fluindo.
 *
 * @param {string} base64 - String base64 do áudio (com ou sem data URI prefix)
 * @param {object} [options={}]
 * @param {boolean} [options.loop=false] - Repetir áudio
 * @returns {Promise<{audioCtx: AudioContext, audio: HTMLAudioElement, blobUrl: string, track: MediaStreamTrack, stream: MediaStream, gainNode: GainNode, duration: number, destroy: function}>}
 * @private
 */
window.FMARK._prepareAudioSource = async function (base64, options = {}) {
  const raw = base64.includes(",") ? base64.split(",")[1] : base64;
  const binary = atob(raw);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  let mime = "audio/ogg";
  if (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0) mime = "audio/mpeg";
  else if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) mime = "audio/wav";
  else if (bytes[0] === 0x1A && bytes[1] === 0x45 && bytes[2] === 0xDF && bytes[3] === 0xA3) mime = "audio/webm";
  console.log("[FMARK] Audio bytes:", bytes.length, "mime:", mime);
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 });
  try { await audioCtx.resume(); } catch (_) {}
  console.log("[FMARK] AudioContext state:", audioCtx.state, "sampleRate:", audioCtx.sampleRate);
  let audioBuffer = null;
  try {
    const copyBuf = bytes.buffer.slice(0);
    audioBuffer = await audioCtx.decodeAudioData(copyBuf);
    const ch0 = audioBuffer.getChannelData(0);
    let maxSample = 0;
    for (let i = 0; i < Math.min(ch0.length, 48000); i++) {
      const abs = Math.abs(ch0[i]);
      if (abs > maxSample) maxSample = abs;
    }
    console.log("[FMARK] decodeAudioData OK: duration:", audioBuffer.duration.toFixed(2),
      "s, channels:", audioBuffer.numberOfChannels, "sampleRate:", audioBuffer.sampleRate,
      "frames:", audioBuffer.length, "maxSample:", maxSample.toFixed(6));
    if (maxSample < 0.0001) {
      console.warn("[FMARK] decodeAudioData produced SILENT buffer (maxSample ~0). Will try <audio> element.");
      audioBuffer = null;
    }
  } catch (err) {
    console.warn("[FMARK] decodeAudioData failed:", err?.message);
    audioBuffer = null;
  }
  let audioElement = null;
  let blobUrl = null;
  if (!audioBuffer) {
    console.log("[FMARK] Trying <audio> element decode...");
    const blob = new Blob([bytes], { type: mime });
    blobUrl = URL.createObjectURL(blob);
    audioElement = document.createElement("audio");
    audioElement.src = blobUrl;
    audioElement.loop = true;
    audioElement.crossOrigin = "anonymous";
    audioElement.preload = "auto";
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Audio load timeout")), 8000);
      audioElement.oncanplaythrough = () => { clearTimeout(timeout); resolve(); };
      audioElement.onerror = () => { clearTimeout(timeout); reject(new Error("Audio load error")); };
      audioElement.load();
    });
    console.log("[FMARK] <audio> loaded: duration:", audioElement.duration.toFixed(2), "s");
    audioElement.volume = 1.0;
    audioElement.muted = false;
    await audioElement.play();
    const elemSrc = audioCtx.createMediaElementSource(audioElement);
    const offlineDest = audioCtx.createMediaStreamDestination();
    elemSrc.connect(offlineDest);
    elemSrc.connect(audioCtx.destination);
    await new Promise((r) => setTimeout(r, 500));
    const rmsAnalyser = audioCtx.createAnalyser();
    rmsAnalyser.fftSize = 2048;
    elemSrc.connect(rmsAnalyser);
    await new Promise((r) => setTimeout(r, 300));
    const rmsData = new Float32Array(rmsAnalyser.fftSize);
    rmsAnalyser.getFloatTimeDomainData(rmsData);
    const elemRms = Math.sqrt(rmsData.reduce((s, v) => s + v * v, 0) / rmsData.length);
    console.log("[FMARK] <audio> element RMS:", elemRms.toFixed(6));
    if (elemRms > 0.0001) {
      const destTrack = offlineDest.stream.getAudioTracks()[0];
      console.log("[FMARK] <audio> element producing audio! track:", destTrack?.readyState);
      window.FMARK._audioNodes = { elemSrc, offlineDest, rmsAnalyser, audioElement, audioCtx };
      return {
        audioCtx, audioBuffer: null, audioElement, blobUrl,
        track: destTrack, stream: offlineDest.stream,
        usedMethod: "mediaElementSource",
        duration: audioElement.duration,
        _nodes: window.FMARK._audioNodes,
        destroy: () => {
          try { audioElement.pause(); } catch (_) {}
          try { audioElement.src = ""; } catch (_) {}
          try { URL.revokeObjectURL(blobUrl); } catch (_) {}
          try { audioCtx.close(); } catch (_) {}
          window.FMARK._audioNodes = null;
        },
      };
    }
    console.warn("[FMARK] <audio> element also silent. Will use manual sine buffer.");
    try { audioElement.pause(); audioElement.src = ""; } catch (_) {}
    try { URL.revokeObjectURL(blobUrl); } catch (_) {}
    blobUrl = null;
    audioElement = null;
  }
  if (!audioBuffer) {
    console.log("[FMARK] Generating manual 440Hz sine wave AudioBuffer...");
    const sampleRate = audioCtx.sampleRate;
    const durationSec = 30;
    const totalFrames = sampleRate * durationSec;
    audioBuffer = audioCtx.createBuffer(1, totalFrames, sampleRate);
    const ch = audioBuffer.getChannelData(0);
    for (let i = 0; i < totalFrames; i++) {
      ch[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.8;
    }
    console.log("[FMARK] Manual sine buffer: frames:", totalFrames,
      "sample[0]:", ch[0].toFixed(6), "sample[100]:", ch[100].toFixed(6),
      "duration:", audioBuffer.duration.toFixed(2), "s");
  }
  const bufferSource = audioCtx.createBufferSource();
  bufferSource.buffer = audioBuffer;
  bufferSource.loop = true;
  const dest = audioCtx.createMediaStreamDestination();
  bufferSource.connect(dest);
  bufferSource.start();
  const track = dest.stream.getAudioTracks()[0];
  window.FMARK._audioNodes = { bufferSource, dest, audioCtx };
  const rmsAn = audioCtx.createAnalyser();
  rmsAn.fftSize = 2048;
  bufferSource.connect(rmsAn);
  await new Promise((r) => setTimeout(r, 200));
  const rmsData = new Float32Array(rmsAn.fftSize);
  rmsAn.getFloatTimeDomainData(rmsData);
  const rms = Math.sqrt(rmsData.reduce((s, v) => s + v * v, 0) / rmsData.length);
  rmsAn.disconnect();
  const ch0 = audioBuffer.getChannelData(0);
  let bufferMaxSample = 0;
  for (let i = 0; i < ch0.length; i++) {
    const a = Math.abs(ch0[i]);
    if (a > bufferMaxSample) bufferMaxSample = a;
    if (bufferMaxSample > 0.01) break;
  }
  const audioHasData = bufferMaxSample > 0.001 || rms > 0.0001;
  console.log("[FMARK] BufferSource track:", track?.readyState, "enabled:", track?.enabled,
    "RMS:", rms.toFixed(6), "bufferMaxSample:", bufferMaxSample.toFixed(6),
    "audioHasData:", audioHasData);
  const usedMethod = audioBuffer.duration >= 25 ? "sineWave(440Hz)" : "decodedAudio";
  const dur = audioBuffer.duration >= 25 ? 30 : audioBuffer.duration;
  console.log("[FMARK] Final source: method=" + usedMethod + " track:", track?.readyState,
    "enabled:", track?.enabled, "RMS:", rms.toFixed(6));
  return {
    audioCtx, audioBuffer, audioElement, blobUrl,
    track, stream: dest.stream, usedMethod,
    duration: dur,
    _nodes: window.FMARK._audioNodes,
    destroy: () => {
      try { bufferSource.stop(); } catch (_) {}
      try { if (audioElement) { audioElement.pause(); audioElement.src = ""; } } catch (_) {}
      try { if (blobUrl) URL.revokeObjectURL(blobUrl); } catch (_) {}
      try { audioCtx.close(); } catch (_) {}
      window.FMARK._audioNodes = null;
    },
  };
};

/**
 * Instala hook em getUserMedia em TODOS os níveis + hooks nos consumidores de áudio.
 * CRÍTICO: Cada intercept retorna um CLONE do track (track.clone()) para evitar que
 * o VoIP mate nosso track original ao chamar track.stop().
 *
 * @param {MediaStreamTrack} injectionTrack - Track de áudio do _prepareAudioSource
 * @param {AudioContext} audioCtx - AudioContext do _prepareAudioSource
 * @param {AudioBuffer} [audioBuffer] - AudioBuffer decodificado para injeção on-demand no CMS
 * @returns {{restore: function}}
 * @private
 */
window.FMARK._hookGetUserMedia = function (injectionTrack, audioCtx, audioBuffer) {
  if (window.FMARK._gumHooked) {
    window.FMARK._restoreGetUserMedia();
  }
  window.FMARK._gumHooked = true;
  window.FMARK._gumInterceptCount = 0;
  window.FMARK._gumInjectionTrack = injectionTrack;
  window.FMARK._gumAudioCtx = audioCtx;
  window.FMARK._gumAudioBuffer = audioBuffer || null;
  window.FMARK._gumClones = [];
  const origInstanceGUM = navigator.mediaDevices.getUserMedia;
  const origProtoGUM = MediaDevices.prototype.getUserMedia;
  window.FMARK._origInstanceGUM = origInstanceGUM;
  window.FMARK._origProtoGUM = origProtoGUM;
  const interceptGUM = async (constraints, label) => {
    window.FMARK._gumInterceptCount++;
    const n = window.FMARK._gumInterceptCount;
    console.log("[FMARK] getUserMedia INTERCEPTED via " + label + " (#" + n + ")");
    try {
      const realStream = await origInstanceGUM.call(navigator.mediaDevices,
        typeof constraints.audio === "object" ? { audio: constraints.audio } : { audio: true }
      );
      realStream.getAudioTracks().forEach((t) => t.stop());
      console.log("[FMARK] Real mic acquired + stopped (permission only)");
    } catch (e) {
      console.warn("[FMARK] Real getUserMedia failed:", e?.message);
    }
    const srcTrack = window.FMARK._gumInjectionTrack;
    console.log("[FMARK] Source track state:", srcTrack.readyState, "enabled:", srcTrack.enabled);
    let trackForVoip;
    if (srcTrack.readyState === "live") {
      trackForVoip = srcTrack.clone();
      window.FMARK._gumClones.push(trackForVoip);
      console.log("[FMARK] Cloned track:", trackForVoip.id, "state:", trackForVoip.readyState);
    } else {
      console.warn("[FMARK] Source track is ENDED! Creating fresh audio on-the-fly...");
      const freshCtx = window.FMARK._gumAudioCtx || new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 });
      try { await freshCtx.resume(); } catch (_) {}
      let freshBuf = window.FMARK._gumAudioBuffer;
      if (!freshBuf) {
        freshBuf = freshCtx.createBuffer(1, freshCtx.sampleRate * 30, freshCtx.sampleRate);
        const ch = freshBuf.getChannelData(0);
        for (let i = 0; i < ch.length; i++) ch[i] = Math.sin(2 * Math.PI * 440 * i / freshCtx.sampleRate) * 0.8;
      }
      const src = freshCtx.createBufferSource();
      src.buffer = freshBuf;
      src.loop = true;
      const dst = freshCtx.createMediaStreamDestination();
      src.connect(dst);
      src.start();
      trackForVoip = dst.stream.getAudioTracks()[0];
      window.FMARK._audioNodes = window.FMARK._audioNodes || {};
      window.FMARK._audioNodes["rescue_" + n] = { src, dst, ctx: freshCtx };
      console.log("[FMARK] Rescue track created:", trackForVoip.id, "state:", trackForVoip.readyState);
    }
    const resultStream = new MediaStream([trackForVoip]);
    if (constraints.video) {
      try {
        const realVideo = await origInstanceGUM.call(navigator.mediaDevices, { video: constraints.video });
        realVideo.getVideoTracks().forEach((t) => resultStream.addTrack(t));
      } catch (_) {}
    }
    console.log("[FMARK] Returning stream, audio track:", trackForVoip.id,
      "state:", trackForVoip.readyState, "enabled:", trackForVoip.enabled);
    return resultStream;
  };
  navigator.mediaDevices.getUserMedia = async function (constraints) {
    if (constraints && constraints.audio && window.FMARK._gumHooked) {
      return interceptGUM(constraints, "instance");
    }
    return origInstanceGUM.call(navigator.mediaDevices, constraints);
  };
  MediaDevices.prototype.getUserMedia = async function (constraints) {
    if (constraints && constraints.audio && window.FMARK._gumHooked) {
      return interceptGUM(constraints, "prototype");
    }
    return origProtoGUM.call(navigator.mediaDevices, constraints);
  };
  try {
    const g = self || window;
    if (g.importNamespace) {
      const waGUM = g.importNamespace("WAGetUserMedia");
      if (waGUM && waGUM.getUserMedia) {
        window.FMARK._origWAGetUserMedia = waGUM.getUserMedia;
        waGUM.getUserMedia = async function (constraints) {
          if (constraints && constraints.audio && window.FMARK._gumHooked) {
            return interceptGUM(constraints, "WAGetUserMedia");
          }
          return window.FMARK._origWAGetUserMedia(constraints);
        };
        console.log("[FMARK] WAGetUserMedia module patched");
      }
    }
  } catch (err) {
    console.warn("[FMARK] Failed to patch WAGetUserMedia:", err);
  }
  window.FMARK._hookAudioConsumers(injectionTrack, audioBuffer);
  console.log("[FMARK] getUserMedia hook installed (instance + prototype + WAGetUserMedia + audio consumers)");
  return { restore: () => window.FMARK._restoreGetUserMedia() };
};

/**
 * Restaura todos os hooks de getUserMedia e consumidores de áudio.
 * Limpa clones de tracks criados durante os intercepts.
 * @private
 */
window.FMARK._restoreGetUserMedia = function () {
  if (window.FMARK._origInstanceGUM) {
    navigator.mediaDevices.getUserMedia = window.FMARK._origInstanceGUM;
    window.FMARK._origInstanceGUM = null;
  }
  if (window.FMARK._origProtoGUM) {
    MediaDevices.prototype.getUserMedia = window.FMARK._origProtoGUM;
    window.FMARK._origProtoGUM = null;
  }
  try {
    if (window.FMARK._origWAGetUserMedia) {
      const g = self || window;
      if (g.importNamespace) {
        const waGUM = g.importNamespace("WAGetUserMedia");
        if (waGUM) waGUM.getUserMedia = window.FMARK._origWAGetUserMedia;
      }
      window.FMARK._origWAGetUserMedia = null;
    }
  } catch (_) {}
  if (window.FMARK._gumClones) {
    window.FMARK._gumClones.forEach((t) => { try { t.stop(); } catch (_) {} });
    window.FMARK._gumClones = [];
  }
  window.FMARK._gumHooked = false;
  window.FMARK._gumInjectionTrack = null;
  window.FMARK._gumAudioCtx = null;
  window.FMARK._gumAudioBuffer = null;
  window.FMARK._restoreAudioConsumers();
  console.log("[FMARK] getUserMedia restored (all levels)");
};

/**
 * Hook nos consumidores de áudio: MediaStreamTrackProcessor e createMediaStreamSource.
 *
 * ESTRATÉGIA DUPLA:
 * 1. MediaStreamTrackProcessor: hook em window (caso VoIP não tenha cacheado)
 * 2. createMediaStreamSource: cria áudio DIRETAMENTE no AudioContext do VoIP (on-demand)
 *    Isso elimina problemas de cross-context e GC — o áudio nasce no contexto do consumidor.
 *
 * @param {MediaStreamTrack} customAudioTrack - Track de áudio processado para injetar
 * @param {AudioBuffer} [audioBuffer] - AudioBuffer decodificado para criar audio on-demand
 * @private
 */
window.FMARK._hookAudioConsumers = function (customAudioTrack, audioBuffer) {
  window.FMARK._restoreAudioConsumers();
  window.FMARK._audioInjectionTrack = customAudioTrack;
  window.FMARK._audioInjectionBuffer = audioBuffer || null;
  window.FMARK._cmsInjectedNodes = [];
  if (window.MediaStreamTrackProcessor) {
    const OrigMSTP = window.MediaStreamTrackProcessor;
    window.FMARK._origMSTP = OrigMSTP;
    window.MediaStreamTrackProcessor = function (init) {
      if (init && init.track && init.track.kind === "audio" && window.FMARK._audioInjectionTrack) {
        const srcTrack = window.FMARK._audioInjectionTrack;
        let useTrack = srcTrack.readyState === "live" ? srcTrack.clone() : srcTrack;
        console.log("[FMARK] MSTP INTERCEPTED audio:", init.track.id,
          "→ swap to:", useTrack.id, "state:", useTrack.readyState);
        return new OrigMSTP({ ...init, track: useTrack });
      }
      return new OrigMSTP(init);
    };
    window.MediaStreamTrackProcessor.prototype = OrigMSTP.prototype;
    try { Object.defineProperty(window.MediaStreamTrackProcessor, "name", { value: "MediaStreamTrackProcessor", configurable: true }); } catch (_) {}
    console.log("[FMARK] MediaStreamTrackProcessor hook installed");
  }
  const origCMS = AudioContext.prototype.createMediaStreamSource;
  window.FMARK._origCreateMediaStreamSource = origCMS;
  AudioContext.prototype.createMediaStreamSource = function (stream) {
    if (window.FMARK._audioInjectionTrack || window.FMARK._audioInjectionBuffer) {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        console.log("[FMARK] CMS INTERCEPTED on VoIP AudioContext. Creating audio ON THIS ctx.");
        try {
          const buf = window.FMARK._audioInjectionBuffer;
          if (buf) {
            const src = this.createBufferSource();
            src.buffer = buf;
            src.loop = true;
            const dst = this.createMediaStreamDestination();
            src.connect(dst);
            src.start();
            window.FMARK._cmsInjectedNodes.push({ src, dst, ctx: this });
            console.log("[FMARK] CMS → AudioBuffer injected on VoIP ctx, track:",
              dst.stream.getAudioTracks()[0]?.readyState);
            return origCMS.call(this, dst.stream);
          }
          const sampleRate = this.sampleRate || 48000;
          const sineBuf = this.createBuffer(1, sampleRate * 30, sampleRate);
          const ch = sineBuf.getChannelData(0);
          for (let i = 0; i < ch.length; i++) {
            ch[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.8;
          }
          const src = this.createBufferSource();
          src.buffer = sineBuf;
          src.loop = true;
          const dst = this.createMediaStreamDestination();
          src.connect(dst);
          src.start();
          window.FMARK._cmsInjectedNodes.push({ src, dst, ctx: this });
          console.log("[FMARK] CMS → 440Hz sine injected on VoIP ctx, track:",
            dst.stream.getAudioTracks()[0]?.readyState);
          return origCMS.call(this, dst.stream);
        } catch (e) {
          console.error("[FMARK] CMS on-demand injection error:", e);
        }
      }
    }
    return origCMS.call(this, stream);
  };
  if (window.webkitAudioContext) {
    window.FMARK._origCreateMediaStreamSourceWebkit = window.webkitAudioContext.prototype.createMediaStreamSource;
    window.webkitAudioContext.prototype.createMediaStreamSource = AudioContext.prototype.createMediaStreamSource;
  }
  console.log("[FMARK] Audio consumer hooks installed (MSTP + CMS on-demand)");
};

/**
 * Restaura os hooks dos consumidores de áudio e limpa nós criados on-demand.
 * @private
 */
window.FMARK._restoreAudioConsumers = function () {
  if (window.FMARK._origMSTP) {
    window.MediaStreamTrackProcessor = window.FMARK._origMSTP;
    window.FMARK._origMSTP = null;
  }
  if (window.FMARK._origCreateMediaStreamSource) {
    AudioContext.prototype.createMediaStreamSource = window.FMARK._origCreateMediaStreamSource;
    window.FMARK._origCreateMediaStreamSource = null;
  }
  if (window.FMARK._origCreateMediaStreamSourceWebkit && window.webkitAudioContext) {
    window.webkitAudioContext.prototype.createMediaStreamSource = window.FMARK._origCreateMediaStreamSourceWebkit;
    window.FMARK._origCreateMediaStreamSourceWebkit = null;
  }
  if (window.FMARK._cmsInjectedNodes) {
    window.FMARK._cmsInjectedNodes.forEach((n) => {
      try { n.src.stop(); } catch (_) {}
      try { n.src.disconnect(); } catch (_) {}
    });
    window.FMARK._cmsInjectedNodes = [];
  }
  window.FMARK._audioInjectionTrack = null;
  window.FMARK._audioInjectionBuffer = null;
};

/**
 * Inicia uma chamada e injeta áudio base64 DIRETAMENTE na ligação.
 * Pipeline: decodeAudioData → AudioBufferSourceNode → MediaStreamDestination → track.clone()
 * Fallback: <audio> element → createMediaElementSource | sine wave 440Hz manual.
 * Cada getUserMedia intercept retorna um CLONE do track (imune a track.stop() do VoIP).
 * CMS hook cria áudio on-demand no AudioContext do VoIP (elimina cross-context/GC).
 *
 * @param {string} chatId - ID do chat destino (ex: '5511999999999@c.us')
 * @param {string} base64Audio - Áudio em base64 (OGG/Opus PTT, mp3, wav, webm). Pode ter data URI prefix.
 * @param {object} [options={}]
 * @param {boolean} [options.isVideo=false] - true para videochamada
 * @param {boolean} [options.endCallOnFinish=false] - Encerrar chamada quando o áudio terminar
 * @param {boolean} [options.loop=false] - Repetir o áudio em loop indefinidamente
 * @param {function} [options.onAudioStart] - Callback quando o áudio começa (chamada atendida)
 * @param {function} [options.onAudioEnd] - Callback quando o áudio termina
 * @param {function} [options.onAnswer] - Callback quando a pessoa atende
 * @param {function} [options.onEnd] - Callback quando a chamada termina
 * @returns {Promise<{success: boolean, callId?: string, error?: string, duration?: number, stop?: function}>}
 *
 * @example
 * const result = await FMARK.startCallWithAudio('5511999999999@c.us', myBase64OGG, {
 *   endCallOnFinish: true,
 * });
 * if (result.stop) result.stop();
 */
window.FMARK.startCallWithAudio = async function (chatId, base64Audio, options = {}) {
  if (!base64Audio || typeof base64Audio !== "string") {
    return { success: false, error: "base64_audio_required" };
  }
  let audioSource;
  try {
    audioSource = await window.FMARK._prepareAudioSource(base64Audio, { loop: !!options.loop });
    console.log("[FMARK] Audio prepared: method=" + audioSource.usedMethod +
      " duration:", audioSource.duration.toFixed(2), "s, track:", audioSource.track?.readyState);
  } catch (err) {
    return { success: false, error: "audio_prepare_failed: " + (err?.message || err) };
  }
  window.FMARK._hookGetUserMedia(audioSource.track, audioSource.audioCtx, audioSource.audioBuffer);
  window.FMARK._activeAudioSource = audioSource;
  let _destroyed = false;
  let autoStopTimeout = null;
  const stopFn = async () => {
    if (_destroyed) return;
    _destroyed = true;
    if (autoStopTimeout) clearTimeout(autoStopTimeout);
    window.FMARK._restoreGetUserMedia();
    audioSource.destroy();
    window.FMARK._activeAudioSource = null;
    if (options.onAudioEnd) {
      try { options.onAudioEnd(); } catch (_) {}
    }
    if (options.endCallOnFinish) {
      try { await window.FMARK.endCall(); } catch (_) {}
    }
  };
  const callResult = await window.FMARK.startCall(chatId, {
    isVideo: !!options.isVideo,
    onAnswer: async (call) => {
      if (_destroyed) return;
      console.log("[FMARK] Call answered! method=" + audioSource.usedMethod);
      console.log("[FMARK] getUserMedia intercept count:", window.FMARK._gumInterceptCount);
      console.log("[FMARK] Source track state:", audioSource.track?.readyState);
      console.log("[FMARK] Active clones:", (window.FMARK._gumClones || []).map(
        (t) => t.id.substring(0, 8) + ":" + t.readyState).join(", "));
      console.log("[FMARK] CMS injected nodes:", (window.FMARK._cmsInjectedNodes || []).length);
      if (options.onAudioStart) {
        try { options.onAudioStart(); } catch (_) {}
      }
      if (!options.loop && audioSource.usedMethod !== "sineWave(440Hz)" && !autoStopTimeout) {
        const durationMs = Math.ceil(audioSource.duration * 1000) + 1000;
        autoStopTimeout = setTimeout(async () => {
          if (!_destroyed) {
            console.log("[FMARK] Audio finished playing in call");
            await stopFn();
          }
        }, durationMs);
      }
      if (options.onAnswer) {
        try { options.onAnswer(call, { success: true, duration: audioSource.duration }); } catch (_) {}
      }
    },
    onEnd: (call) => {
      if (!_destroyed) {
        _destroyed = true;
        if (autoStopTimeout) clearTimeout(autoStopTimeout);
        window.FMARK._restoreGetUserMedia();
        audioSource.destroy();
        window.FMARK._activeAudioSource = null;
      }
      if (options.onEnd) {
        try { options.onEnd(call); } catch (_) {}
      }
    },
  });
  if (!callResult.success) {
    window.FMARK._restoreGetUserMedia();
    audioSource.destroy();
    window.FMARK._activeAudioSource = null;
    return callResult;
  }
  console.log("[FMARK] Call started. method=" + audioSource.usedMethod +
    " track:", audioSource.track?.readyState);
  console.log("[FMARK] getUserMedia intercept count:", window.FMARK._gumInterceptCount);
  if (window.FMARK._gumInterceptCount === 0) {
    console.warn("[FMARK] WARNING: getUserMedia was NOT intercepted! Audio cannot flow.");
  }
  return {
    ...callResult,
    duration: audioSource.duration,
    usedMethod: audioSource.usedMethod,
    stop: stopFn,
  };
};

/**
 * Injeta NOVO áudio em uma chamada JÁ ATIVA.
 * Prepara nova fonte de áudio e atualiza os hooks.
 *
 * @param {string} base64Audio - Novo áudio em base64
 * @param {object} [options={}]
 * @param {boolean} [options.loop=false] - Repetir
 * @param {boolean} [options.endCallOnFinish=false] - Encerrar quando terminar
 * @returns {Promise<{success: boolean, duration?: number, error?: string, stop?: function}>}
 */
window.FMARK.injectAudioInCall = async function (base64Audio, options = {}) {
  if (!base64Audio || typeof base64Audio !== "string") {
    return { success: false, error: "base64_audio_required" };
  }
  if (!window.FMARK._gumHooked) {
    return { success: false, error: "no_active_call - use startCallWithAudio first" };
  }
  if (window.FMARK._activeAudioSource) {
    window.FMARK._activeAudioSource.destroy();
  }
  let audioSource;
  try {
    audioSource = await window.FMARK._prepareAudioSource(base64Audio, { loop: !!options.loop });
  } catch (err) {
    return { success: false, error: "audio_prepare_failed: " + (err?.message || err) };
  }
  window.FMARK._activeAudioSource = audioSource;
  window.FMARK._gumInjectionTrack = audioSource.track;
  window.FMARK._hookAudioConsumers(audioSource.track, audioSource.audioBuffer);
  let stopTimeout;
  const stopFn = () => {
    if (stopTimeout) clearTimeout(stopTimeout);
    audioSource.destroy();
    if (options.endCallOnFinish) {
      window.FMARK.endCall().catch(() => {});
    }
  };
  if (!options.loop && audioSource.usedMethod !== "sineWave(440Hz)") {
    stopTimeout = setTimeout(() => {
      console.log("[FMARK] Injected audio finished");
      if (options.endCallOnFinish) {
        window.FMARK.endCall().catch(() => {});
      }
    }, Math.ceil(audioSource.duration * 1000) + 500);
  }
  console.log("[FMARK] New audio injected, method=" + audioSource.usedMethod +
    " duration:", audioSource.duration.toFixed(2), "s");
  return { success: true, duration: audioSource.duration, usedMethod: audioSource.usedMethod, stop: stopFn };
};

// ═══════════════════════════════════════════════════════════════════
//  CALL AND CAPTURE — Liga, envia áudio, captura resposta em base64
//  Função unificada que faz tudo: chama, injeta áudio, captura
//  o que a pessoa fala e retorna como base64.
// ═══════════════════════════════════════════════════════════════════

/**
 * Liga para uma pessoa, envia um áudio base64, e captura o que ela falar (como base64).
 * Tudo numa única chamada. A captura inicia quando a pessoa atender.
 *
 * IMPORTANTE: Na PRIMEIRA vez que chamar, o Chrome vai mostrar um dialog para
 * compartilhar áudio da aba. Selecione a aba atual e clique "Permitir".
 * Depois disso, as próximas chamadas reutilizam a permissão automaticamente.
 *
 * @param {string} chatId - ID do contato (ex: '5511999999999@c.us')
 * @param {string} base64Audio - Áudio para enviar (OGG/Opus, MP3, WAV, WebM). Base64 string.
 * @param {object} [options={}]
 * @param {boolean} [options.isVideo=false] - Videochamada
 * @param {number} [options.captureInterval=3000] - Intervalo de atualização da captura (ms)
 * @param {number} [options.maxDuration=0] - Duração máxima da chamada em ms (0 = sem limite)
 * @param {boolean} [options.endCallOnAudioFinish=false] - Desligar quando o áudio enviado terminar
 * @param {boolean} [options.endCallOnMaxDuration=true] - Desligar ao atingir maxDuration
 * @param {function} [options.onAnswer] - Callback quando a pessoa atende
 * @param {function} [options.onAudioSent] - Callback quando o áudio enviado termina de tocar
 * @param {function} [options.onCaptureUpdate] - Callback com {base64, duration, size} da captura
 * @param {function} [options.onEnd] - Callback quando a chamada termina: (result) => {}
 * @returns {Promise<{success: boolean, callId?: string, error?: string, stop?: function,
 *   getCapture?: function, getCaptureChunks?: function}>}
 *
 * @example
 * // Ligação simples: envia áudio, captura resposta, desliga após 30s
 * const call = await FMARK.callAndCapture('5511999999999@c.us', meuAudioBase64, {
 *   maxDuration: 30000,
 *   onCaptureUpdate: (data) => console.log("Captura:", data.duration.toFixed(1) + "s"),
 *   onEnd: (result) => {
 *     console.log("Chamada terminou! Áudio capturado:", result.capturedAudio.base64.length, "chars");
 *     console.log("Duração:", result.capturedAudio.duration.toFixed(1) + "s");
 *   },
 * });
 * // Ler captura a qualquer momento:
 * const cap = call.getCapture(); // { base64: "...", duration: 12.5 }
 * // Parar manualmente:
 * const final = await call.stop(); // retorna { capturedAudio: { base64, duration, mimeType } }
 */
window.FMARK.callAndCapture = async function (chatId, base64Audio, options = {}) {
  if (!chatId) return { success: false, error: "chatId_required" };
  if (!base64Audio || typeof base64Audio !== "string") {
    return { success: false, error: "base64_audio_required" };
  }
  const captureInterval = options.captureInterval || 3000;
  const maxDuration = options.maxDuration || 0;
  const endOnAudioFinish = !!options.endCallOnAudioFinish;
  const endOnMaxDuration = options.endCallOnMaxDuration !== false;
  let _captureStarted = false;
  let _callEnded = false;
  let _maxDurationTimer = null;
  const getCaptureFn = () => {
    return {
      base64: window.FMARK._remoteAudioBase64 || "",
      duration: window.FMARK._remoteCapture?.totalDuration || 0,
      mimeType: window.FMARK._remoteCapture?.recorder?.mimeType || "audio/webm",
      recording: !!window.FMARK._remoteCapture?.active,
      chunks: (window.FMARK._remoteAudioChunks || []).length,
    };
  };
  const getChunksFn = () => {
    return [...(window.FMARK._remoteAudioChunks || [])];
  };
  const stopAndCollect = async () => {
    if (_maxDurationTimer) { clearTimeout(_maxDurationTimer); _maxDurationTimer = null; }
    let capturedAudio = { base64: "", duration: 0, mimeType: "audio/webm" };
    if (_captureStarted && window.FMARK._remoteCapture?.active) {
      const stopResult = await window.FMARK.stopRemoteAudioCapture();
      if (stopResult.success) {
        capturedAudio = {
          base64: stopResult.base64,
          duration: stopResult.duration,
          mimeType: stopResult.mimeType,
        };
      }
    } else {
      capturedAudio = {
        base64: window.FMARK._remoteAudioBase64 || "",
        duration: window.FMARK._remoteCapture?.totalDuration || 0,
        mimeType: window.FMARK._remoteCapture?.recorder?.mimeType || "audio/webm",
      };
    }
    if (!_callEnded) {
      try { await window.FMARK.endCall(); } catch (_) {}
    }
    return { capturedAudio, chunks: [...(window.FMARK._remoteAudioChunks || [])] };
  };
  const finishCall = async (reason) => {
    if (_callEnded) return;
    _callEnded = true;
    console.log("[FMARK] callAndCapture ending. Reason:", reason);
    const result = await stopAndCollect();
    if (options.onEnd) {
      try { options.onEnd({ reason, ...result }); } catch (_) {}
    }
  };
  const startCapture = async () => {
    if (_captureStarted) return;
    if (window.FMARK._remoteCapture?.active) {
      _captureStarted = true;
      console.log("[FMARK] callAndCapture: reusing active remote capture");
      return;
    }
    try {
      const captureResult = await window.FMARK.startRemoteAudioCapture({
        updateInterval: captureInterval,
        onUpdate: (data) => {
          if (options.onCaptureUpdate) {
            try { options.onCaptureUpdate(data); } catch (_) {}
          }
        },
      });
      if (captureResult.success) {
        _captureStarted = true;
        console.log("[FMARK] callAndCapture: remote capture started");
      } else {
        console.warn("[FMARK] callAndCapture: capture failed:", captureResult.error);
      }
    } catch (err) {
      console.warn("[FMARK] callAndCapture: capture error:", err?.message);
    }
  };
  await startCapture();
  const callResult = await window.FMARK.startCallWithAudio(chatId, base64Audio, {
    isVideo: !!options.isVideo,
    loop: false,
    endCallOnFinish: false,
    onAudioStart: () => {
      console.log("[FMARK] callAndCapture: audio injection started");
    },
    onAudioEnd: () => {
      console.log("[FMARK] callAndCapture: sent audio finished");
      if (options.onAudioSent) { try { options.onAudioSent(); } catch (_) {} }
      if (endOnAudioFinish && !_callEnded) {
        setTimeout(() => finishCall("audio_finished"), 500);
      }
    },
    onAnswer: (call, info) => {
      console.log("[FMARK] callAndCapture: call answered, capture active:", _captureStarted);
      if (maxDuration > 0) {
        _maxDurationTimer = setTimeout(() => {
          if (endOnMaxDuration) {
            finishCall("max_duration");
          }
        }, maxDuration);
      }
      if (options.onAnswer) { try { options.onAnswer(call, info); } catch (_) {} }
    },
    onEnd: (call) => {
      if (!_callEnded) {
        _callEnded = true;
        const capturedAudio = {
          base64: window.FMARK._remoteAudioBase64 || "",
          duration: window.FMARK._remoteCapture?.totalDuration || 0,
          mimeType: window.FMARK._remoteCapture?.recorder?.mimeType || "audio/webm",
        };
        if (options.onEnd) {
          try { options.onEnd({ reason: "call_ended", capturedAudio, chunks: [...(window.FMARK._remoteAudioChunks || [])] }); } catch (_) {}
        }
      }
    },
  });
  if (!callResult.success) {
    if (_captureStarted) {
      await window.FMARK.stopRemoteAudioCapture();
    }
    return callResult;
  }
  return {
    ...callResult,
    getCapture: getCaptureFn,
    getCaptureChunks: getChunksFn,
    /**
     * Envia um novo áudio base64 durante a chamada ativa (substitui o anterior).
     * @param {string} newBase64Audio - Novo áudio em base64
     * @returns {Promise<{success: boolean, duration?: number, error?: string}>}
     */
    sendAudio: async (newBase64Audio) => {
      if (_callEnded) return { success: false, error: "call_already_ended" };
      return await window.FMARK.injectAudioInCall(newBase64Audio);
    },
    stop: async () => {
      if (callResult.stop) callResult.stop();
      return await stopAndCollect();
    },
  };
};

/**
 * Liga para MÚLTIPLAS pessoas em sequência, envia áudio e captura resposta de cada uma.
 * Espera cada chamada terminar antes de iniciar a próxima.
 *
 * @param {string[]} chatIds - Lista de IDs (ex: ['5511999999999@c.us', '5511888888888@c.us'])
 * @param {string} base64Audio - Áudio base64 para enviar (mesmo para todos)
 * @param {object} [options={}]
 * @param {number} [options.maxDuration=30000] - Duração máxima de cada chamada (ms)
 * @param {boolean} [options.endCallOnAudioFinish=true] - Desligar quando o áudio enviado terminar
 * @param {number} [options.delayBetweenCalls=3000] - Intervalo entre chamadas (ms)
 * @param {number} [options.captureInterval=3000] - Intervalo de atualização da captura (ms)
 * @param {boolean} [options.isVideo=false] - Videochamada
 * @param {function} [options.onCallStart] - Callback: (chatId, index) => {}
 * @param {function} [options.onCallEnd] - Callback: (chatId, index, result) => {}
 * @param {function} [options.onProgress] - Callback: (completed, total) => {}
 * @param {function} [options.onComplete] - Callback: (results) => {}
 * @returns {Promise<{success: boolean, results: Array<{chatId, success, capturedAudio?, error?}>, cancel?: function}>}
 *
 * @example
 * const r = await FMARK.callGroupWithAudio(
 *   ['5511999999999@c.us', '5511888888888@c.us', '5511777777777@c.us'],
 *   meuAudioBase64,
 *   {
 *     maxDuration: 30000,
 *     endCallOnAudioFinish: true,
 *     delayBetweenCalls: 3000,
 *     onCallEnd: (chatId, i, result) => {
 *       console.log(`Chamada ${i+1}:`, chatId, "captura:", result.capturedAudio?.duration?.toFixed(1) + "s");
 *     },
 *     onComplete: (results) => {
 *       results.forEach((r) => console.log(r.chatId, ":", r.capturedAudio?.base64?.length || 0, "chars"));
 *     },
 *   }
 * );
 */
window.FMARK.callGroupWithAudio = async function (chatIds, base64Audio, options = {}) {
  if (!Array.isArray(chatIds) || chatIds.length === 0) {
    return { success: false, results: [], error: "chatIds_array_required" };
  }
  if (!base64Audio || typeof base64Audio !== "string") {
    return { success: false, results: [], error: "base64_audio_required" };
  }
  const maxDuration = options.maxDuration || 30000;
  const endOnAudioFinish = options.endCallOnAudioFinish !== false;
  const delayBetweenCalls = options.delayBetweenCalls || 3000;
  const captureInterval = options.captureInterval || 3000;
  let cancelled = false;
  const results = [];
  console.log("[FMARK] callGroupWithAudio: starting", chatIds.length, "calls");
  for (let i = 0; i < chatIds.length; i++) {
    if (cancelled) {
      results.push({ chatId: chatIds[i], success: false, error: "cancelled" });
      continue;
    }
    const chatId = chatIds[i];
    console.log("[FMARK] callGroup [" + (i + 1) + "/" + chatIds.length + "]:", chatId);
    if (options.onCallStart) {
      try { options.onCallStart(chatId, i); } catch (_) {}
    }
    try {
      const callResult = await new Promise(async (resolve) => {
        let resolved = false;
        const done = (result) => {
          if (resolved) return;
          resolved = true;
          resolve(result);
        };
        const call = await window.FMARK.callAndCapture(chatId, base64Audio, {
          isVideo: !!options.isVideo,
          loop: false,
          maxDuration,
          captureInterval,
          endCallOnAudioFinish: endOnAudioFinish,
          endCallOnMaxDuration: true,
          onEnd: (result) => {
            done({
              chatId,
              success: true,
              capturedAudio: result.capturedAudio,
              chunks: result.chunks,
              reason: result.reason,
            });
          },
        });
        if (!call.success) {
          done({ chatId, success: false, error: call.error });
          return;
        }
        setTimeout(() => {
          if (!resolved) {
            const finalCapture = call.getCapture ? call.getCapture() : {};
            if (call.stop) call.stop();
            done({ chatId, success: true, capturedAudio: finalCapture, reason: "safety_timeout" });
          }
        }, maxDuration + 15000);
      });
      results.push(callResult);
      if (options.onCallEnd) {
        try { options.onCallEnd(chatId, i, callResult); } catch (_) {}
      }
    } catch (err) {
      results.push({ chatId, success: false, error: err?.message || String(err) });
    }
    if (options.onProgress) {
      try { options.onProgress(i + 1, chatIds.length); } catch (_) {}
    }
    if (i < chatIds.length - 1 && !cancelled) {
      if (window.FMARK._remoteCapture?.active) {
        await window.FMARK.stopRemoteAudioCapture();
      }
      console.log("[FMARK] callGroup: waiting", delayBetweenCalls, "ms before next call...");
      await new Promise((r) => setTimeout(r, delayBetweenCalls));
    }
  }
  if (window.FMARK._remoteCapture?.active) {
    await window.FMARK.stopRemoteAudioCapture();
  }
  console.log("[FMARK] callGroupWithAudio: done.", results.length, "calls.",
    results.filter((r) => r.success).length, "success,",
    results.filter((r) => !r.success).length, "failed");
  if (options.onComplete) {
    try { options.onComplete(results); } catch (_) {}
  }
  return {
    success: true,
    results,
    cancel: () => { cancelled = true; },
  };
};

// ═══════════════════════════════════════════════════════════════════
//  CAPTURA DE ÁUDIO REMOTO (Incoming Call Audio)
//  Estratégia: usa getDisplayMedia para capturar TODO áudio da aba.
//  WhatsApp não usa <audio> elements — o áudio vai por WASM/DataChannels.
//  getDisplayMedia é a ÚNICA forma confiável de capturar esse áudio.
//  Requer 1 clique do usuário para permitir (dialog do Chrome).
//  O base64 é atualizado continuamente via window.FMARK._remoteAudioBase64.
// ═══════════════════════════════════════════════════════════════════

/**
 * Inicia captura do áudio da aba via getDisplayMedia.
 * Chrome mostra um dialog — selecione a aba atual e clique "Compartilhar".
 * Após isso, TODO áudio da aba (incluindo áudio da chamada) é capturado.
 *
 * @param {object} [options={}]
 * @param {number} [options.updateInterval=3000] - Intervalo em ms para atualizar o base64
 * @param {function} [options.onUpdate] - Callback com {base64, duration, size, mimeType}
 * @param {function} [options.onStart] - Callback quando a gravação inicia
 * @returns {Promise<{success: boolean, error?: string}>}
 *
 * @example
 * await FMARK.startRemoteAudioCapture({
 *   updateInterval: 3000,
 *   onUpdate: (data) => console.log("Audio:", data.duration.toFixed(1) + "s", data.size, "bytes"),
 * });
 * // Ler a qualquer momento:
 * const audio = FMARK.getRemoteAudio();
 * console.log(audio.base64.substring(0, 50) + "...", audio.duration + "s");
 */
window.FMARK.startRemoteAudioCapture = async function (options = {}) {
  if (window.FMARK._remoteCapture?.active) {
    return { success: false, error: "capture_already_active" };
  }
  const updateInterval = options.updateInterval || 3000;
  const onUpdate = typeof options.onUpdate === "function" ? options.onUpdate : null;
  const onStart = typeof options.onStart === "function" ? options.onStart : null;
  let displayStream;
  try {
    displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
      preferCurrentTab: true,
      selfBrowserSurface: "include",
      systemAudio: "include",
    });
  } catch (err) {
    console.error("[FMARK] getDisplayMedia failed:", err?.message);
    return { success: false, error: "getDisplayMedia_denied: " + (err?.message || err) };
  }
  displayStream.getVideoTracks().forEach((t) => t.stop());
  const audioTracks = displayStream.getAudioTracks();
  if (audioTracks.length === 0) {
    console.error("[FMARK] getDisplayMedia returned no audio tracks! Did you check 'Share tab audio'?");
    return { success: false, error: "no_audio_track - marque 'Compartilhar áudio da guia' no dialog" };
  }
  const audioStream = new MediaStream(audioTracks);
  console.log("[FMARK] Tab audio captured:", audioTracks.length, "tracks,",
    audioTracks.map((t) => t.label + ":" + t.readyState).join(", "));
  let mimeType = "audio/webm;codecs=opus";
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = "audio/webm";
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = "";
  }
  const recorder = new MediaRecorder(audioStream, mimeType ? { mimeType } : {});
  const state = {
    active: true,
    recorder,
    recordedBlobs: [],
    stream: audioStream,
    displayStream,
    startTime: Date.now(),
    updateTimer: null,
    totalDuration: 0,
  };
  window.FMARK._remoteCapture = state;
  window.FMARK._remoteAudioBase64 = "";
  window.FMARK._remoteAudioChunks = [];
  let chunkBlobIndex = 0;
  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      state.recordedBlobs.push(event.data);
    }
  };
  audioTracks[0].onended = () => {
    console.log("[FMARK] Tab audio track ended (user stopped sharing)");
    if (state.active) {
      window.FMARK.stopRemoteAudioCapture();
    }
  };
  recorder.start(1000);
  console.log("[FMARK] MediaRecorder started, mimeType:", recorder.mimeType);
  if (onStart) { try { onStart(); } catch (_) {} }
  state.updateTimer = setInterval(async () => {
    if (!state.active || !state.recordedBlobs.length) return;
    try {
      const fullBlob = new Blob(state.recordedBlobs, { type: recorder.mimeType });
      const fullBase64 = await window.FMARK._blobToBase64(fullBlob);
      const dur = (Date.now() - state.startTime) / 1000;
      window.FMARK._remoteAudioBase64 = fullBase64;
      state.totalDuration = dur;
      const newBlobs = state.recordedBlobs.slice(chunkBlobIndex);
      if (newBlobs.length > 0) {
        const chunkBlob = new Blob(newBlobs, { type: recorder.mimeType });
        const chunkBase64 = await window.FMARK._blobToBase64(chunkBlob);
        const chunkDur = newBlobs.length;
        chunkBlobIndex = state.recordedBlobs.length;
        window.FMARK._remoteAudioChunks.push({
          base64: chunkBase64, duration: chunkDur, timestamp: Date.now(),
          mimeType: recorder.mimeType, size: chunkBlob.size,
          totalDuration: dur,
        });
        if (window.FMARK._remoteAudioChunks.length > 200) {
          window.FMARK._remoteAudioChunks = window.FMARK._remoteAudioChunks.slice(-100);
        }
      }
      if (onUpdate) {
        try {
          onUpdate({ base64: fullBase64, duration: dur, totalDuration: dur, mimeType: recorder.mimeType, size: fullBlob.size });
        } catch (_) {}
      }
    } catch (err) {
      console.warn("[FMARK] Remote audio update error:", err?.message);
    }
  }, updateInterval);
  console.log("[FMARK] Remote audio capture active! Base64 updates every", updateInterval, "ms");
  return { success: true };
};

/**
 * Para a captura e retorna o áudio completo em base64.
 *
 * @returns {Promise<{success: boolean, base64?: string, duration?: number, mimeType?: string, error?: string}>}
 */
window.FMARK.stopRemoteAudioCapture = async function () {
  const state = window.FMARK._remoteCapture;
  if (!state) {
    return { success: false, error: "no_active_capture" };
  }
  state.active = false;
  if (state.updateTimer) {
    clearInterval(state.updateTimer);
    state.updateTimer = null;
  }
  let finalBase64 = "";
  let mimeType = "";
  let dur = 0;
  if (state.recorder) {
    mimeType = state.recorder.mimeType;
    if (state.recorder.state !== "inactive") {
      await new Promise((resolve) => {
        state.recorder.onstop = resolve;
        state.recorder.stop();
      });
    }
    if (state.recordedBlobs.length) {
      const blob = new Blob(state.recordedBlobs, { type: mimeType });
      finalBase64 = await window.FMARK._blobToBase64(blob);
      dur = (Date.now() - state.startTime) / 1000;
    }
  }
  if (state.stream) {
    state.stream.getTracks().forEach((t) => { try { t.stop(); } catch (_) {} });
  }
  if (state.displayStream) {
    state.displayStream.getTracks().forEach((t) => { try { t.stop(); } catch (_) {} });
  }
  window.FMARK._remoteAudioBase64 = finalBase64;
  console.log("[FMARK] Remote audio capture stopped. Duration:", dur.toFixed(2), "s, size:",
    finalBase64.length, "chars, blobs:", state.recordedBlobs.length);
  window.FMARK._remoteCapture = null;
  return {
    success: true,
    base64: finalBase64,
    duration: dur,
    mimeType: mimeType || "audio/webm",
  };
};

/**
 * Retorna o áudio remoto capturado até agora SEM parar.
 * @returns {{success: boolean, base64: string, duration: number, mimeType: string}}
 */
window.FMARK.getRemoteAudio = function () {
  const state = window.FMARK._remoteCapture;
  return {
    success: true,
    base64: window.FMARK._remoteAudioBase64 || "",
    duration: state ? state.totalDuration : 0,
    mimeType: state?.recorder?.mimeType || "audio/webm",
    recording: !!state?.recorder,
    chunks: (window.FMARK._remoteAudioChunks || []).length,
  };
};

/**
 * Converte Blob para base64 string (sem data URI prefix).
 * @private
 */
window.FMARK._blobToBase64 = function (blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      const base64 = result.split(",")[1] || result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Codifica Float32Array PCM mono em WAV base64.
 * @param {Float32Array} samples - PCM samples (-1.0 a 1.0)
 * @param {number} sampleRate - Sample rate (ex: 16000)
 * @returns {string} Base64 string do WAV completo
 * @private
 */
window.FMARK._encodeWavBase64 = function (samples, sampleRate) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }
  const bytes = new Uint8Array(buffer);
  let binaryStr = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binaryStr += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
  }
  return btoa(binaryStr);
};

/**
 * Converte áudio base64 para texto via Web Speech API.
 *
 * @param {string} base64Audio - Áudio em base64
 * @param {object} [options={}]
 * @param {string} [options.lang="pt-BR"] - Idioma
 * @param {number} [options.timeout=30000] - Timeout em ms
 * @returns {Promise<{success: boolean, text?: string, confidence?: number, error?: string}>}
 */
window.FMARK.audioToText = async function (base64Audio, options = {}) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    return { success: false, error: "speech_recognition_not_supported" };
  }
  const lang = options.lang || "pt-BR";
  const timeout = options.timeout || 30000;
  return new Promise((resolve) => {
    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = true;
    let fullText = "";
    let bestConfidence = 0;
    let timeoutId;
    const finish = (result) => {
      if (timeoutId) clearTimeout(timeoutId);
      try { recognition.stop(); } catch (_) {}
      resolve(result);
    };
    timeoutId = setTimeout(() => {
      finish({
        success: !!fullText,
        text: fullText.trim(),
        confidence: bestConfidence,
        error: fullText ? undefined : "timeout",
      });
    }, timeout);
    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) {
          fullText += r[0].transcript + " ";
          if (r[0].confidence > bestConfidence) bestConfidence = r[0].confidence;
        }
      }
    };
    recognition.onerror = (event) => {
      if (event.error === "no-speech") {
        finish({ success: !!fullText, text: fullText.trim(), confidence: bestConfidence, error: fullText ? undefined : "no_speech" });
      } else {
        finish({ success: false, error: event.error, text: fullText.trim() });
      }
    };
    recognition.onend = () => {
      finish({ success: true, text: fullText.trim(), confidence: bestConfidence });
    };
    recognition.start();
  });
};

/**
 * Transcreve áudio base64 usando uma API externa (OpenAI Whisper, Google STT, ou custom).
 * Envia o áudio capturado para o endpoint e retorna o texto transcrito.
 *
 * @param {string} base64Audio - Áudio em base64 (WebM, WAV, OGG, MP3)
 * @param {object} [options={}]
 * @param {string} [options.apiKey] - API key (obrigatório para OpenAI/Google)
 * @param {string} [options.provider="openai"] - Provider: "openai", "custom"
 * @param {string} [options.apiUrl] - URL customizada (para provider "custom")
 * @param {string} [options.lang="pt"] - Idioma (ISO 639-1)
 * @param {string} [options.model="whisper-1"] - Modelo (OpenAI)
 * @param {string} [options.mimeType="audio/webm"] - MIME type do áudio
 * @returns {Promise<{success: boolean, text?: string, error?: string}>}
 *
 * @example
 * // OpenAI Whisper
 * const r = await FMARK.transcribeAudio(base64, { apiKey: "sk-...", lang: "pt" });
 * console.log(r.text);
 *
 * // API customizada
 * const r = await FMARK.transcribeAudio(base64, {
 *   provider: "custom",
 *   apiUrl: "https://meu-servidor.com/stt",
 *   lang: "pt",
 * });
 */
window.FMARK.transcribeAudio = async function (base64Audio, options = {}) {
  if (!base64Audio) {
    return { success: false, error: "no_audio" };
  }
  const provider = options.provider || "openai";
  const lang = options.lang || "pt";
  const mimeType = options.mimeType || "audio/webm";
  const ext = mimeType.includes("webm") ? "webm" : mimeType.includes("wav") ? "wav" : mimeType.includes("ogg") ? "ogg" : "mp3";
  const raw = base64Audio.includes(",") ? base64Audio.split(",")[1] : base64Audio;
  const binary = atob(raw);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mimeType });
  const file = new File([blob], "audio." + ext, { type: mimeType });
  if (provider === "openai") {
    const apiKey = options.apiKey;
    if (!apiKey) return { success: false, error: "apiKey required for OpenAI" };
    const model = options.model || "whisper-1";
    const formData = new FormData();
    formData.append("file", file);
    formData.append("model", model);
    formData.append("language", lang);
    try {
      const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { "Authorization": "Bearer " + apiKey },
        body: formData,
      });
      if (!resp.ok) {
        const errBody = await resp.text();
        return { success: false, error: "OpenAI " + resp.status + ": " + errBody };
      }
      const data = await resp.json();
      console.log("[FMARK] Whisper transcription:", data.text);
      return { success: true, text: data.text || "" };
    } catch (err) {
      return { success: false, error: "fetch_error: " + (err?.message || err) };
    }
  }
  if (provider === "custom") {
    const apiUrl = options.apiUrl;
    if (!apiUrl) return { success: false, error: "apiUrl required for custom provider" };
    const formData = new FormData();
    formData.append("file", file);
    formData.append("language", lang);
    if (options.apiKey) {
      formData.append("apiKey", options.apiKey);
    }
    try {
      const headers = {};
      if (options.apiKey) headers["Authorization"] = "Bearer " + options.apiKey;
      const resp = await fetch(apiUrl, { method: "POST", headers, body: formData });
      if (!resp.ok) {
        return { success: false, error: "API " + resp.status + ": " + (await resp.text()) };
      }
      const data = await resp.json();
      return { success: true, text: data.text || data.transcript || data.result || "" };
    } catch (err) {
      return { success: false, error: "fetch_error: " + (err?.message || err) };
    }
  }
  return { success: false, error: "unknown provider: " + provider };
};

/**
 * Transcrição ao vivo: captura áudio da aba e envia chunks para API de STT.
 * Requer startRemoteAudioCapture() ativo.
 *
 * @param {object} options
 * @param {string} options.apiKey - API key (obrigatório para OpenAI)
 * @param {string} [options.provider="openai"] - "openai" ou "custom"
 * @param {string} [options.apiUrl] - URL para provider "custom"
 * @param {string} [options.lang="pt"] - Idioma
 * @param {number} [options.chunkInterval=5000] - Intervalo entre transcrições (ms)
 * @param {function} [options.onText] - Callback com texto transcrito de cada chunk
 * @param {function} [options.onError] - Callback de erro
 * @returns {{success: boolean, stop?: function, getTranscript?: function, error?: string}}
 *
 * @example
 * // 1. Iniciar captura primeiro
 * await FMARK.startRemoteAudioCapture({ updateInterval: 3000 });
 * // 2. Iniciar transcrição ao vivo
 * const stt = FMARK.startLiveTranscription({
 *   apiKey: "sk-...",
 *   lang: "pt",
 *   chunkInterval: 5000,
 *   onText: (text) => console.log(">>> Pessoa disse:", text),
 * });
 * // 3. Parar
 * const result = FMARK.stopLiveTranscription();
 * console.log("Texto completo:", result.text);
 */
window.FMARK.startLiveTranscription = function (options = {}) {
  if (window.FMARK._liveTranscription) {
    window.FMARK.stopLiveTranscription();
  }
  const apiKey = options.apiKey;
  const provider = options.provider || "openai";
  const apiUrl = options.apiUrl;
  const lang = options.lang || "pt";
  const chunkInterval = options.chunkInterval || 5000;
  const onText = typeof options.onText === "function" ? options.onText : null;
  const onError = typeof options.onError === "function" ? options.onError : null;
  if (provider === "openai" && !apiKey) {
    return { success: false, error: "apiKey required. Use: startLiveTranscription({ apiKey: 'sk-...' })" };
  }
  if (provider === "custom" && !apiUrl) {
    return { success: false, error: "apiUrl required for custom provider" };
  }
  if (!window.FMARK._remoteCapture?.active) {
    return { success: false, error: "no_active_capture. Call startRemoteAudioCapture() first" };
  }
  let stopped = false;
  let transcriptLog = [];
  let lastProcessedChunkIndex = 0;
  let processing = false;
  const processChunks = async () => {
    if (stopped || processing) return;
    const chunks = window.FMARK._remoteAudioChunks || [];
    if (chunks.length <= lastProcessedChunkIndex) return;
    processing = true;
    const latestChunk = chunks[chunks.length - 1];
    lastProcessedChunkIndex = chunks.length;
    try {
      const result = await window.FMARK.transcribeAudio(latestChunk.base64, {
        apiKey, provider, apiUrl, lang,
        mimeType: latestChunk.mimeType || "audio/webm",
      });
      if (result.success && result.text) {
        transcriptLog.push({ text: result.text, time: Date.now(), duration: latestChunk.duration });
        console.log("[FMARK] STT:", result.text);
        if (onText) { try { onText(result.text, latestChunk.duration); } catch (_) {} }
      } else if (!result.success) {
        console.warn("[FMARK] STT error:", result.error);
        if (onError) { try { onError(result.error); } catch (_) {} }
      }
    } catch (err) {
      console.warn("[FMARK] STT exception:", err?.message);
    }
    processing = false;
  };
  const timer = setInterval(processChunks, chunkInterval);
  console.log("[FMARK] Live transcription started, provider:", provider, "interval:", chunkInterval, "ms");
  const stopFn = () => {
    if (stopped) return;
    stopped = true;
    clearInterval(timer);
    console.log("[FMARK] Live transcription stopped, phrases:", transcriptLog.length);
  };
  const getTranscript = () => transcriptLog.map((e) => e.text).join(" ");
  const getLog = () => [...transcriptLog];
  window.FMARK._liveTranscription = { stop: stopFn, getTranscript, getLog };
  return { success: true, stop: stopFn, getTranscript, getLog };
};

/**
 * Para transcrição ao vivo e retorna texto completo.
 * @returns {{text: string, log: Array}|null}
 */
window.FMARK.stopLiveTranscription = function () {
  if (!window.FMARK._liveTranscription) return null;
  const lt = window.FMARK._liveTranscription;
  const result = { text: lt.getTranscript(), log: lt.getLog() };
  lt.stop();
  window.FMARK._liveTranscription = null;
  return result;
};

/**
 * Retorna transcrição acumulada SEM parar.
 * @returns {{text: string, phrases: number}|null}
 */
window.FMARK.getTranscription = function () {
  if (!window.FMARK._liveTranscription) return null;
  return {
    text: window.FMARK._liveTranscription.getTranscript(),
    phrases: window.FMARK._liveTranscription.getLog().length,
  };
};

// ═══════════════════════════════════════════════════════════════════

/**
 * Send list message (WPP.chat.sendListMessage compatible)
 * @param {string} chatId - Chat ID (e.g. '5511999999999@c.us')
 * @param {object} options - List options
 * @param {string} options.buttonText - Button text (required)
 * @param {string} options.description - Description text (required)
 * @param {string} [options.title] - Title text (optional)
 * @param {string} [options.footer] - Footer text (optional)
 * @param {Array} options.sections - Sections array with rows
 * @returns {Promise<object|false>} - Message result or false on error
 * @example
 * await FMARK.sendListMessage('5511999999999@c.us', {
 *   buttonText: 'Click here',
 *   description: 'Choose an option',
 *   title: 'Menu',
 *   footer: 'Footer text',
 *   sections: [{
 *     title: 'Section 1',
 *     rows: [
 *       { rowId: '1', title: 'Option 1', description: 'Desc 1' },
 *       { rowId: '2', title: 'Option 2', description: 'Desc 2' }
 *     ]
 *   }]
 * });
 */
window.FMARK.sendListMessage = async function (chatId, options = {}) {
  try {
    const Store = window.Store;
    
    // CRITICAL: Ensure patches are applied before sending list messages
    fmarkEnsureButtonsTransportPatch();
    
    // Validate required fields
    const buttonText = options.buttonText || "";
    const description = options.description || " ";
    const title = options.title || "";
    const footer = options.footer || "";
    const sections = Array.isArray(options.sections) ? options.sections : [];
    
    if (!buttonText) {
      console.error("[FMARK] sendListMessage: buttonText is required");
      return false;
    }
    
    if (!sections.length || sections.length > 10) {
      console.error("[FMARK] sendListMessage: sections must have between 1 and 10 items");
      return false;
    }
    
    // Validate sections structure
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      if (!section.rows || !Array.isArray(section.rows)) {
        console.error(`[FMARK] sendListMessage: section ${i} must have a 'rows' array`);
        return false;
      }
      // Ensure each row has rowId
      for (let j = 0; j < section.rows.length; j++) {
        if (!section.rows[j].rowId) {
          section.rows[j].rowId = `row_${i}_${j}`;
        }
      }
    }
    
    // Resolve chat
    const getLid = await window.FMARK.getLidFromPhoneID(chatId);
    const resolvedId = getLid || (typeof chatId === "string" ? chatId : chatId?._serialized);
    if (!resolvedId) {
      console.error("[FMARK] sendListMessage: invalid chatId");
      return false;
    }
    
    const userWid = Store.WidFactory.createWid(resolvedId);
    const { chat } = await Store.FindChat.findOrCreateLatestChat(userWid);
    const targetChat = chat ?? Store.Chat.get(userWid);
    
    if (!targetChat) {
      console.error("[FMARK] sendListMessage: chat not found");
      return false;
    }
    
    // Build message payload (WPP format)
    const fromWid = await Store.UserPrefs.getMaybeMePnUser();
    const msgId = await window.FMARK.generateMessageID(targetChat.id._serialized);
    const now = Math.floor(Date.now() / 1000);
    const eph = Store.EphemeralFields?.getEphemeralFields 
      ? Store.EphemeralFields.getEphemeralFields(targetChat) 
      : {};
    
    // List message structure based on WPP - uses listType: 1 internally
    // The patch forces product_list (type 2) in the XML stanza
    const listData = {
      buttonText: buttonText,
      description: description,
      title: title,
      footerText: footer,
      listType: 1, // SINGLE_SELECT - patch will force product_list in XML
      sections: sections,
    };
    
    const message = {
      id: msgId,
      ack: 1,
      from: fromWid,
      to: userWid,
      local: true,
      self: "out",
      t: now,
      isNewMsg: true,
      type: "list",
      body: description, // Required for message preview
      list: listData,
      footer: footer,
      ...eph,
    };
    
    // Send message
    const results = await Promise.all(Store.addAndSendMsgToChat(targetChat, message));
    
    if (Array.isArray(results) && results[0]) {
      // Check if message was sent successfully
      if (results[1]?.messageSendResult) {
        const status = results[1].messageSendResult.toLowerCase();
        if (status === "success" || status === "ok") {
          return results[0];
        }
      }
      // Even if no messageSendResult, return the message if it was added
      return results[0];
    }
    
    return false;
  } catch (err) {
    console.error("[FMARK] Error in sendListMessage:", err);
    return false;
  }
};

/**
 * Abre o chat no Ãºltimo nÃ£o lido (equivalente ao WPP.chat.openChatFromUnread).
 *
 * @example
 * ```js
 * await FMARK.openChatFromUnread('5511999999999@c.us');
 * ```
 */
window.FMARK.openChatFromUnread = async function (chatId, chatEntryPoint = "Chatlist") {
  const chat = await fmarkEnsureChatById(chatId);
  if (!chat) return false;

  const msgs = chat.msgs?.getModelsArray ? chat.msgs.getModelsArray() : chat.msgs?._models || [];
  let targetMsg = null;
  for (let i = msgs.length - 1; i >= 0; i--) {
    const msg = msgs[i];
    if (msg?.isNewMsg) {
      targetMsg = msg;
      break;
    }
  }

  if (!Store.Cmd?.openChatAt) return false;
  return Store.Cmd.openChatAt({
    chat,
    msgContext: targetMsg ? { id: targetMsg.id?.id || targetMsg.id } : null,
    chatEntryPoint,
  });
};

/**
 * Abre o chat no final (equivalente ao WPP.chat.openChatBottom).
 *
 * @example
 * ```js
 * await FMARK.openChatBottom('5511999999999@c.us');
 * ```
 */
window.FMARK.openChatBottom = async function (chatId, chatEntryPoint = "Chatlist") {
  const chat = await fmarkEnsureChatById(chatId);
  if (!chat) return false;

  const msgs = chat.msgs?.getModelsArray ? chat.msgs.getModelsArray() : chat.msgs?._models || [];
  const last = msgs.length ? msgs[msgs.length - 1] : null;

  if (!Store.Cmd?.openChatAt) return false;
  return Store.Cmd.openChatAt({
    chat,
    msgContext: last ? { id: last.id?.id || last.id } : null,
    chatEntryPoint,
  });
};

/**
 * Marca chat como lido (equivalente ao window.FMARK.markIsRead).
 *
 * @example
 * ```js
 * await FMARK.markIsRead('5511999999999@c.us');
 * ```
 */
window.FMARK.markIsRead = async function (chatId) {
  const chat = await fmarkEnsureChatById(chatId);
  if (!chat || !Store.ReadSeen?.sendSeen) return false;
  await Store.ReadSeen.sendSeen({chat});
  return true;
};

/**
 * Marca chat como nÃ£o lido (equivalente ao window.FMARK.markIsUnread).
 *
 * @example
 * ```js
 * await FMARK.markIsUnread('5511999999999@c.us');
 * ```
 */
window.FMARK.markIsUnread = async function (chatId) {
  const chat = await fmarkEnsureChatById(chatId);
  if (!chat) return false;
  try {
    if (Store.Cmd?.markChatUnread) {
      await Store.Cmd.markChatUnread(chat);
      return true;
    }
  } catch {}
  try {
    if (chat.markUnread) {
      await chat.markUnread();
      return true;
    }
  } catch {}
  return false;
};

/**
 * Verifica se contato existe (equivalente ao window.FMARK.queryExists).
 *
 * @example
 * ```js
 * const res = await FMARK.queryExists('5511999999999@c.us');
 * ```
 */
window.FMARK.queryExists = async function (contactId) {
  const wid = fmarkEnsureWid(contactId);
  if (!wid) return null;

  if (Store.checkNumberOptions?.queryWidExists) {
    return await Store.checkNumberOptions.queryWidExists(wid);
  }
  if (Store.checkNumberBeta?.queryWidExists) {
    return await Store.checkNumberBeta.queryWidExists(wid);
  }
  if (Store.checkNumberBeta?.queryExist) {
    return await Store.checkNumberBeta.queryExist(wid);
  }

  return null;
};

/**
 * Cria grupo (equivalente ao WPP.group.create).
 *
 * @example
 * ```js
 * const result = await FMARK.groupCreate('Meu grupo', ['5511999999999@c.us']);
 * console.log(result.gid);
 * ```
 */
window.FMARK.groupCreate = async function (groupName, participantsIds, parentGroup) {
  const ids = Array.isArray(participantsIds) ? participantsIds : [participantsIds].filter(Boolean);
  if (!groupName || !ids.length) return null;

  const normalized = ids.map((id) => (typeof id === "string" ? id : id?._serialized || id)).filter(Boolean);

  const participants = [];
  for (const id of normalized) {
    const wid = fmarkEnsureWid(id);
    if (!wid) continue;
    if (wid.isLid && wid.isLid()) {
      const pn = fmarkGetPnFromLid(wid);
      const pnWid = fmarkEnsureWid(pn);
      if (!pnWid) continue;
      participants.push({ phoneNumber: pnWid, lid: wid, username: null });
      continue;
    }
    const lid = fmarkGetCurrentLid(wid);
    if (lid) {
      participants.push({ phoneNumber: wid, lid, username: null });
    } else {
      participants.push({ phoneNumber: wid, username: null });
    }
  }

  const requestData = {
    title: groupName,
    announce: true,
    ephemeralDuration: 0,
    memberAddMode: false,
    memberLinkMode: false,
    membershipApprovalMode: false,
    parentGroupId: parentGroup ? fmarkEnsureWid(parentGroup) : null,
    restrict: false,
  };

  let response = null;
  try {
    if (Store.createGroup) {
      response = await Store.createGroup(requestData, participants);
    } else if (Store.sendCreateGroup) {
      response = await Store.sendCreateGroup(groupName, participants.map((p) => p.phoneNumber));
    } else if (Store.Wap?.createGroup) {
      response = await Store.Wap.createGroup(groupName, participants.map((p) => p.phoneNumber?.toString?.() || p.phoneNumber));
    }
  } catch (e) {
    console.error("FMARK.groupCreate failed:", e);
    return null;
  }

  const gid = response?.gid || response?.wid || response?.id || null;
  const gidWid = fmarkEnsureWid(gid) || gid;

  const participantsMap = {};
  const list = response?.participants || response?.participant || [];
  if (Array.isArray(list)) {
    for (const p of list) {
      const widStr = p?.wid || p?.userWid || p?.id;
      if (!widStr) continue;
      const code = p?.code != null ? Number(p.code) : p?.error != null ? Number(p.error) : 200;
      const key = widStr._serialized || (widStr.toString ? widStr.toString() : widStr);
      participantsMap[key] = {
        wid: key,
        code,
        invite_code: p?.invite_code || null,
        invite_code_exp: p?.invite_code_exp != null ? Number(p.invite_code_exp) || null : null,
        message: code === 200 ? "OK" : "ERROR",
      };
    }
  }

  const out = { gid: gidWid, participants: participantsMap };
  try {
    Object.assign(out, participantsMap);
  } catch {}
  return out;
};

/**
 * Entra em grupo (equivalente ao WPP.group.join).
 *
 * @example
 * ```js
 * await FMARK.groupJoin('https://chat.whatsapp.com/XXXX');
 * ```
 */
window.FMARK.groupJoin = async function (inviteCode) {
  return window.FMARK.joinGroupViaLink(inviteCode);
};

/**
 * Lista participantes do grupo (equivalente ao WPP.group.getParticipants).
 *
 * @example
 * ```js
 * const members = await FMARK.groupGetParticipants('123@g.us');
 * ```
 */
window.FMARK.groupGetParticipants = async function (groupId) {
  const group = await window.FMARK.getGroupMetadata(groupId);
  const models = group?.participants?.getModelsArray ? group.participants.getModelsArray() : group?.participants?._models || [];
  return models.map((p) => p.id?._serialized || (p.id?.toString ? p.id.toString() : p.id));
};

/**
 * Verifica se pode adicionar participantes (equivalente ao WPP.group.canAdd).
 *
 * @example
 * ```js
 * const canAdd = await FMARK.groupCanAdd('123@g.us');
 * ```
 */
window.FMARK.groupCanAdd = async function (groupId) {
  const groupChat = await fmarkGetGroupChat(groupId);
  if (!groupChat?.groupMetadata?.participants?.canAdd) return false;
  try {
    return !!groupChat.groupMetadata.participants.canAdd();
  } catch {}
  return false;
};

/**
 * Adiciona participantes (equivalente ao WPP.group.addParticipants).
 *
 * @example
 * ```js
 * const res = await FMARK.groupAddParticipants('123@g.us', '5511999999999@c.us');
 * console.log(res['5511999999999@c.us'].code);
 * ```
 */
window.FMARK.groupAddParticipants = async function (groupId, participantsIds) {
  const ids = fmarkNormalizeParticipantIds(participantsIds);
  if (!ids.length) return {};

  const resultMap = {};
  for (const id of ids) {
    const key = id.includes("@") ? id : `${id}@c.us`;
    resultMap[key] = { code: 200, message: "OK" };
  }

  const ok = await window.FMARK.addParticipant(groupId, ids);
  if (!ok) {
    for (const key of Object.keys(resultMap)) {
      resultMap[key] = { code: 500, message: "FAILED" };
    }
  }

  return resultMap;
};

// ==================== CALL FUNCTIONS (baseado exatamente no WPP/wa-js) ====================

/**
 * Obtém o WID do usuário atual (baseado no WPP getMyUserId)
 * @private
 */
function _fmarkGetMyUserId() {
  const Store = window.Store;
  // Tentar UserPrefs primeiro (método mais recente)
  if (Store.UserPrefs?.getMaybeMeUser) {
    return Store.UserPrefs.getMaybeMeUser();
  }
  if (Store.UserPrefs?.getMeUser) {
    return Store.UserPrefs.getMeUser();
  }
  // Fallback via Me
  if (Store.Me?.getMaybeMeUser) {
    return Store.Me.getMaybeMeUser();
  }
  // Fallback via localStorage
  const lastWid = localStorage.getItem("last-wid-md") || localStorage.getItem("last-wid");
  if (lastWid && Store.WidFactory?.createWid) {
    try {
      return Store.WidFactory.createWid(lastWid.replace(/"/g, ""));
    } catch {}
  }
  return null;
}

/**
 * Prepara destino E2E para chamada (cópia exata do WPP prepareDestination)
 * @private
 */
async function _fmarkPrepareDestionation(wids, encKey) {
  const Store = window.Store;
  
  // Obter função smax (do websocket ou direto)
  const smax = Store.websocket?.smax || Store.smax;
  const ensureE2ESessions = Store.websocket?.ensureE2ESessions || Store.ensureE2ESessions;
  
  if (!Store.getFanOutList || !ensureE2ESessions || !Store.encryptMsgProtobuf || !smax) {
    console.error("[FMARK] Módulos de call não disponíveis para prepareDestionation");
    return [];
  }

  const fanList = await Store.getFanOutList({ wids });
  await ensureE2ESessions(fanList);

  let shouldHaveIdentity = false;
  const destination = await Promise.all(
    fanList.map(async (wid) => {
      const { type, ciphertext } = await Store.encryptMsgProtobuf(wid, 0, {
        call: {
          callKey: new Uint8Array(encKey),
        },
      });

      shouldHaveIdentity = shouldHaveIdentity || type === "pkmsg";

      return smax(
        "to",
        {
          jid: wid.toString({ legacy: true }),
        },
        [
          smax(
            "enc",
            {
              v: "2",
              type: type,
              count: "0",
            },
            ciphertext
          ),
        ]
      );
    })
  );

  const content = [];
  content.push(smax("destination", {}, destination));

  if (shouldHaveIdentity && Store.adv?.getADVEncodedIdentity) {
    const identity = await Store.adv.getADVEncodedIdentity();
    content.push(smax("device-identity", undefined, identity));
  }

  return content;
}

/**
 * Analisa resposta de relay (cópia do WPP parseRelayResponse)
 * @private
 */
function _fmarkParseRelayResponse(response) {
  const result = {
    relays: [],
    error: null,
  };
  
  if (!response) return result;

  if (response.content && Array.isArray(response.content)) {
    for (const item of response.content) {
      if (item.tag === "relay") {
        result.relays.push({
          token: item.attrs?.token,
          host: item.attrs?.ip,
          port: parseInt(item.attrs?.port) || 0,
        });
      }
    }
  }

  return result;
}

/**
 * Inicia chamada usando o módulo nativo VoipStartCall (chamada completa com áudio).
 * Esta função tenta usar a stack de chamadas nativa do WhatsApp Web.
 *
 * @param {string} to - Número de destino (ex: '5511999999999@c.us' ou '5511999999999')
 * @param {Object} options - Opções da chamada
 * @param {boolean} options.isVideo - Se é videochamada (default: false)
 * @returns {Promise<boolean>} true se a chamada foi iniciada
 *
 * @example
 * ```js
 * // Chamada de voz nativa
 * await FMARK.callOfferNative('5511999999999@c.us');
 * // Videochamada nativa
 * await FMARK.callOfferNative('5511999999999@c.us', { isVideo: true });
 * ```
 */
window.FMARK.callOfferNative = async function (to, options = {}) {
  const Store = window.Store;
  const isVideo = options.isVideo || false;

  // Verificar se VoipStartCall está disponível
  if (!Store.VoipStartCall?.startWAWebVoipCall) {
    console.warn("[FMARK] VoipStartCall nativo não disponível, use callOffer");
    return false;
  }

  if (!Store.WidFactory?.createWid) {
    console.warn("[FMARK] WidFactory não disponível");
    return false;
  }

  try {
    // Preparar WID de destino
    const toId = typeof to === "string" ? to : to._serialized || to.id?._serialized;
    if (!toId) {
      console.error("[FMARK] ID de destino inválido");
      return false;
    }

    const toWid = Store.WidFactory.createWid(toId.includes("@") ? toId : `${toId}@c.us`);

    // Verificar se é usuário (não grupo)
    if (toWid.isGroup && toWid.isGroup()) {
      console.error("[FMARK] Use callOfferGroup para chamadas em grupo");
      return false;
    }

    // Iniciar chamada nativa
    await Store.VoipStartCall.startWAWebVoipCall(toWid, isVideo);
    console.log("[FMARK] Chamada nativa iniciada com sucesso");
    return true;
  } catch (err) {
    console.error("[FMARK] Erro em callOfferNative:", err);
    return false;
  }
};

/**
 * Inicia chamada em grupo usando o módulo nativo VoipStartCall.
 *
 * @param {Object} chat - Objeto do chat de grupo
 * @param {Object} options - Opções da chamada
 * @param {boolean} options.isVideo - Se é videochamada (default: false)
 * @returns {Promise<boolean>} true se a chamada foi iniciada
 *
 * @example
 * ```js
 * const chat = await FMARK.getChat('123456789@g.us');
 * await FMARK.callOfferGroup(chat, { isVideo: true });
 * ```
 */
window.FMARK.callOfferGroup = async function (chat, options = {}) {
  const Store = window.Store;
  const isVideo = options.isVideo || false;

  // Verificar se VoipStartCall está disponível
  if (!Store.VoipStartCall?.startWAWebVoipGroupCallFromChat) {
    console.warn("[FMARK] VoipStartCall para grupo não disponível");
    return false;
  }

  try {
    await Store.VoipStartCall.startWAWebVoipGroupCallFromChat(chat, isVideo);
    console.log("[FMARK] Chamada de grupo iniciada com sucesso");
    return true;
  } catch (err) {
    console.error("[FMARK] Erro em callOfferGroup:", err);
    return false;
  }
};

/**
 * Inicia chamada (cópia exata do WPP.call.offer).
 * Envia uma oferta de chamada para o destinatário.
 *
 * @param {string} to - Número de destino (ex: '5511999999999@c.us' ou '5511999999999')
 * @param {Object} options - Opções da chamada
 * @param {boolean} options.isVideo - Se é videochamada (default: false)
 * @returns {Promise<Object|false>} Objeto da chamada ou false em caso de erro
 *
 * @example
 * ```js
 * // Chamada de voz
 * await FMARK.callOffer('5511999999999@c.us');
 * // Videochamada
 * await FMARK.callOffer('5511999999999@c.us', { isVideo: true });
 * ```
 */
window.FMARK.callOffer = async function (to, options = {}) {
  const Store = window.Store;
  
  // Configurar opções (igual ao WPP)
  options = Object.assign({ isVideo: false }, options);

  // Obter função smax (do websocket ou direto)
  const smax = Store.websocket?.smax || Store.smax;
  const sendSmaxStanza = Store.websocket?.sendSmaxStanza || Store.sendSmaxStanza;
  const randomHex = Store.randomHex;
  const unixTime = Store.unixTime;

  // Verificar módulos necessários
  if (!smax || !sendSmaxStanza) {
    console.error("[FMARK] Módulos smax/sendSmaxStanza não disponíveis");
    return false;
  }

  if (!Store.WidFactory?.createWid) {
    console.error("[FMARK] WidFactory não disponível");
    return false;
  }

  try {
    // Preparar WID de destino (assertWid)
    const toId = typeof to === "string" ? to : to._serialized || to.id?._serialized;
    if (!toId) {
      throw new Error("ID de destino inválido");
    }

    const toWid = Store.WidFactory.createWid(toId.includes("@") ? toId : `${toId}@c.us`);

    // Verificar se é usuário (não grupo) - isUser()
    if (toWid.isGroup && toWid.isGroup()) {
      throw new Error(`${toWid} não é um usuário para chamada`);
    }

    // Gerar ID da chamada (igual WPP: randomHex(16).substr(0, 64))
    const callId = randomHex ? randomHex(16).substr(0, 64) : 
                   Array.from(crypto.getRandomValues(new Uint8Array(32)))
                     .map(b => b.toString(16).padStart(2, "0")).join("").substr(0, 64);

    // Obter meu ID (igual WPP: getMyUserId())
    const me = _fmarkGetMyUserId();
    if (!me) {
      throw new Error("Meu user id é null ou undefined");
    }

    // Construir conteúdo da chamada (igual WPP)
    const content = [
      smax("audio", { enc: "opus", rate: "16000" }, null),
      smax("audio", { enc: "opus", rate: "8000" }, null),
    ];

    if (options.isVideo) {
      content.push(
        smax(
          "video",
          {
            orientation: "0",
            screen_width: "1920",
            screen_height: "1080",
            device_orientation: "0",
            enc: "vp8",
            dec: "vp8",
          },
          null
        )
      );
    }

    content.push(
      ...[
        smax("net", { medium: "3" }, null),
        smax(
          "capability",
          { ver: "1" },
          new Uint8Array([1, 4, 255, 131, 207, 4])
        ),
        smax("encopt", { keygen: "2" }, null),
      ]
    );

    // Preparar criptografia E2E (igual WPP)
    const encKey = self.crypto.getRandomValues(new Uint8Array(32)).buffer;
    content.push(...(await _fmarkPrepareDestionation([toWid], encKey)));

    // Construir node da chamada (igual WPP)
    const node = smax(
      "call",
      {
        to: toWid.toString({ legacy: true }),
        id: randomHex ? randomHex(8) : Array.from(crypto.getRandomValues(new Uint8Array(4))).map(b => b.toString(16).padStart(2, "0")).join(""),
      },
      [
        smax(
          "offer",
          {
            "call-id": callId,
            "call-creator": me.toString({ legacy: true }),
          },
          content
        ),
      ]
    );

    // Criar modelo da chamada (igual WPP: new CallModel({...}))
    const offerTime = unixTime ? unixTime() : Math.floor(Date.now() / 1000);
    
    let model = null;
    const CallStore = Store.CallStore || Store.CallCollection;
    const CallModel = Store.CallModel;
    const CALL_STATES = Store.CALL_STATES;

    if (CallModel && CallStore) {
      model = new CallModel({
        id: callId,
        peerJid: toWid,
        isVideo: options.isVideo,
        isGroup: false,
        outgoing: true,
        offerTime: offerTime,
        webClientShouldHandle: false,
        canHandleLocally: true,
      });

      // Adicionar ao CallStore (igual WPP)
      CallStore.add(model);

      // Definir como chamada ativa (igual WPP: CallStore.setActiveCall(CallStore.assertGet(callId)))
      if (CallStore.setActiveCall) {
        const activeModel = CallStore.get ? CallStore.get(callId) : model;
        CallStore.setActiveCall(activeModel || model);
      }

      // Definir estado (igual WPP: model.setState(CALL_STATES.OUTGOING_CALLING))
      if (model.setState && CALL_STATES) {
        model.setState(CALL_STATES.OUTGOING_CALLING || CALL_STATES.Calling || 1);
      }
    }

    // Enviar chamada (igual WPP: await websocket.sendSmaxStanza(node))
    const response = await sendSmaxStanza(node);

    console.info("[FMARK] callOffer response:", response);
    console.info("[FMARK] callOffer parsed:", _fmarkParseRelayResponse(response));

    // Retornar modelo (igual WPP)
    return model || {
      id: callId,
      peerJid: toWid,
      isVideo: options.isVideo,
      isGroup: false,
      outgoing: true,
      offerTime: offerTime,
    };
  } catch (err) {
    console.error("[FMARK] Erro em callOffer:", err);
    return false;
  }
};

/**
 * Cancela uma chamada em andamento (diferente de end, usado antes da conexão).
 *
 * @param {string} callId - ID da chamada (opcional)
 * @returns {Promise<boolean>} true se cancelada com sucesso
 *
 * @example
 * ```js
 * await FMARK.callCancel();
 * ```
 */
window.FMARK.callCancel = async function (callId) {
  const Store = window.Store;

  if (!Store.smax || !Store.sendSmaxStanza) {
    console.warn("[FMARK] Módulos não disponíveis para callCancel");
    return false;
  }

  try {
    let call = null;

    const _cc = Store.CallCollection || Store.CallStore;
    if (callId && _cc?.get) {
      call = _cc.get(callId);
    } else if (_cc?.activeCall) {
      call = _cc.activeCall;
    }

    if (!call) {
      console.warn("[FMARK] Nenhuma chamada encontrada para cancelar");
      return false;
    }

    const peerJid = call.peerJid || call.peerJid_;
    if (!peerJid) {
      console.error("[FMARK] peerJid não encontrado");
      return false;
    }

    const me = _fmarkGetMyUserWid();
    const stanzaId = Store.generateStanzaId ? Store.generateStanzaId() :
                     Array.from(crypto.getRandomValues(new Uint8Array(4)))
                       .map(b => b.toString(16).padStart(2, "0")).join("");

    // Node de cancelamento (usado para chamadas outgoing antes de conectar)
    const node = Store.smax(
      "call",
      {
        to: peerJid.toString({ legacy: true }),
        id: stanzaId,
      },
      [
        Store.smax(
          "terminate",
          {
            "call-id": call.id,
            "call-creator": me ? me.toString({ legacy: true }) : peerJid.toString({ legacy: true }),
            reason: "canceled",
          },
          null
        ),
      ]
    );

    await Store.sendSmaxStanza(node);
    console.log("[FMARK] callCancel enviado com sucesso");

    // Atualizar estado se possível
    if (call.setState && Store.CallState) {
      call.setState(Store.CallState.CallStateEnding || 13);
    }

    return true;
  } catch (err) {
    console.error("[FMARK] Erro em callCancel:", err);
    return false;
  }
};

/**
 * Finaliza chamada (cópia do WPP.call.end).
 *
 * @param {string} callId - ID da chamada (opcional, encerra a ativa se não fornecido)
 * @returns {Promise<boolean>} true se encerrada com sucesso
 *
 * @example
 * ```js
 * await FMARK.callEnd();
 * await FMARK.callEnd('callId123');
 * ```
 */
window.FMARK.callEnd = async function (callId) {
  const Store = window.Store;

  // Obter funções websocket (igual WPP)
  const smax = Store.websocket?.smax || Store.smax;
  const sendSmaxStanza = Store.websocket?.sendSmaxStanza || Store.sendSmaxStanza;
  const ensureE2ESessions = Store.websocket?.ensureE2ESessions || Store.ensureE2ESessions;
  const generateId = Store.websocket?.generateId || Store.generateId || Store.randomHex;
  const CallStore = Store.CallStore || Store.CallCollection;
  const CALL_STATES = Store.CALL_STATES;

  // Verificar módulos necessários
  if (!smax || !sendSmaxStanza) {
    console.error("[FMARK] Módulos smax/sendSmaxStanza não disponíveis para callEnd");
    return false;
  }

  try {
    // Estados válidos para encerrar (igual WPP)
    const callOut = [
      CALL_STATES?.ACTIVE,
      CALL_STATES?.OUTGOING_CALLING,
      CALL_STATES?.OUTGOING_RING,
      CALL_STATES?.CallActive,
      "ACTIVE",
      "OUTGOING_CALLING",
      "OUTGOING_RING",
      6, // CallActive
    ].filter(Boolean);

    let call = null;

    // Buscar chamada pelo ID ou pegar a ativa (igual WPP)
    if (callId && CallStore?.get) {
      call = CallStore.get(callId);
    } else if (CallStore?.activeCall !== undefined) {
      call = CallStore.activeCall;
    }

    if (!call) {
      throw new Error(`Chamada ${callId || '<vazio>'} não encontrada`);
    }

    const callState = call.getState ? call.getState() : call.state;
    if (!callOut.includes(callState) && !call.isGroup) {
      throw new Error(`Chamada ${callId || '<vazio>'} não está em estado de chamada ativa (estado: ${callState})`);
    }

    const peerJid = call.peerJid || call.peerJid_;
    if (!peerJid) {
      throw new Error("peerJid não encontrado na chamada");
    }

    // Garantir sessão E2E (igual WPP)
    if (ensureE2ESessions && peerJid.isGroupCall && !peerJid.isGroupCall()) {
      await ensureE2ESessions([peerJid]);
    }

    // Construir node de terminate (igual WPP)
    const node = smax(
      "call",
      {
        to: peerJid.toString({ legacy: true }),
        id: generateId ? generateId() : Array.from(crypto.getRandomValues(new Uint8Array(4))).map(b => b.toString(16).padStart(2, "0")).join(""),
      },
      [
        smax(
          "terminate",
          {
            "call-id": call.id,
            "call-creator": peerJid.toString({ legacy: true }),
          },
          null
        ),
      ]
    );

    await sendSmaxStanza(node);
    console.info("[FMARK] callEnd enviado com sucesso");
    return true;
  } catch (err) {
    console.error("[FMARK] Erro em callEnd:", err);
    return false;
  }
};

/**
 * Aceita uma chamada recebida (cópia do WPP.call.accept).
 *
 * @param {string} callId - ID da chamada (opcional, aceita a primeira se não fornecido)
 * @returns {Promise<boolean>} true se aceita com sucesso
 *
 * @example
 * ```js
 * await FMARK.callAccept();
 * await FMARK.callAccept('callId123');
 * ```
 */
window.FMARK.callAccept = async function (callId) {
  const Store = window.Store;

  // Obter funções websocket (igual WPP)
  const smax = Store.websocket?.smax || Store.smax;
  const sendSmaxStanza = Store.websocket?.sendSmaxStanza || Store.sendSmaxStanza;
  const ensureE2ESessions = Store.websocket?.ensureE2ESessions || Store.ensureE2ESessions;
  const generateId = Store.websocket?.generateId || Store.generateId || Store.randomHex;
  const CallStore = Store.CallStore || Store.CallCollection;
  const CALL_STATES = Store.CALL_STATES;

  // Verificar módulos necessários
  if (!smax || !sendSmaxStanza) {
    console.error("[FMARK] Módulos smax/sendSmaxStanza não disponíveis para callAccept");
    return false;
  }

  try {
    let call = null;

    // Buscar chamada pelo ID ou encontrar a primeira INCOMING_RING (igual WPP)
    if (callId && CallStore?.get) {
      call = CallStore.get(callId);
    } else if (CallStore?.findFirst) {
      call = CallStore.findFirst(
        (c) => {
          const state = c.getState ? c.getState() : c.state;
          return state === CALL_STATES?.INCOMING_RING || 
                 state === "INCOMING_RING" ||
                 c.isGroup;
        }
      );
    }

    if (!call) {
      throw new Error(`Chamada ${callId || '<vazio>'} não encontrada`);
    }

    const callState = call.getState ? call.getState() : call.state;
    if (callState !== "INCOMING_RING" && callState !== CALL_STATES?.INCOMING_RING && !call.isGroup) {
      throw new Error(`Chamada ${callId || '<vazio>'} não está tocando (estado: ${callState})`);
    }

    const peerJid = call.peerJid || call.peerJid_;
    if (!peerJid) {
      throw new Error("peerJid não encontrado na chamada");
    }

    // Garantir sessão E2E (igual WPP)
    if (ensureE2ESessions && peerJid.isGroupCall && !peerJid.isGroupCall()) {
      await ensureE2ESessions([peerJid]);
    }

    // Construir conteúdo de accept (igual WPP)
    const content = [
      smax("audio", { enc: "opus", rate: "16000" }, null),
      smax("audio", { enc: "opus", rate: "8000" }, null),
    ];

    if (call.isVideo) {
      content.push(
        smax(
          "video",
          {
            orientation: "0",
            screen_width: "1920",
            screen_height: "1080",
            device_orientation: "0",
            enc: "vp8",
            dec: "vp8",
          },
          null
        )
      );
    }

    content.push(
      ...[
        smax("net", { medium: "3" }, null),
        smax("encopt", { keygen: "2" }, null),
      ]
    );

    // Construir node de accept (igual WPP)
    const node = smax(
      "call",
      {
        to: peerJid.toString({ legacy: true }),
        id: generateId ? generateId() : Array.from(crypto.getRandomValues(new Uint8Array(4))).map(b => b.toString(16).padStart(2, "0")).join(""),
      },
      [
        smax(
          "accept",
          {
            "call-id": call.id,
            "call-creator": peerJid.toString({ legacy: true }),
          },
          content
        ),
      ]
    );

    await sendSmaxStanza(node);
    console.info("[FMARK] callAccept enviado com sucesso");
    return true;
  } catch (err) {
    console.error("[FMARK] Erro em callAccept:", err);
    return false;
  }
};

/**
 * Rejeita uma chamada recebida (cópia do WPP.call.reject).
 *
 * @param {string} callId - ID da chamada (opcional, rejeita a primeira se não fornecido)
 * @returns {Promise<boolean>} true se rejeitada com sucesso
 *
 * @example
 * ```js
 * await FMARK.callReject();
 * await FMARK.callReject('callId123');
 * ```
 */
window.FMARK.callReject = async function (callId) {
  const Store = window.Store;

  // Obter funções websocket (igual WPP)
  const smax = Store.websocket?.smax || Store.smax;
  const sendSmaxStanza = Store.websocket?.sendSmaxStanza || Store.sendSmaxStanza;
  const ensureE2ESessions = Store.websocket?.ensureE2ESessions || Store.ensureE2ESessions;
  const generateId = Store.websocket?.generateId || Store.generateId || Store.randomHex;
  const CallStore = Store.CallStore || Store.CallCollection;
  const CALL_STATES = Store.CALL_STATES;

  // Verificar módulos necessários
  if (!smax || !sendSmaxStanza) {
    console.error("[FMARK] Módulos smax/sendSmaxStanza não disponíveis para callReject");
    return false;
  }

  try {
    let call = null;

    // Buscar chamada pelo ID ou encontrar a primeira INCOMING_RING (igual WPP)
    if (callId && CallStore?.get) {
      call = CallStore.get(callId);
    } else if (CallStore?.findFirst) {
      call = CallStore.findFirst(
        (c) => {
          const state = c.getState ? c.getState() : c.state;
          // Fix for mantain compatibility with older versions (igual WPP)
          return state === CALL_STATES?.INCOMING_RING ||
            state === "INCOMING_RING" ||
            c.isGroup ||
            // >= 2.3000.10213.x
            state === CALL_STATES?.ReceivedCall ||
            state === 3;
        }
      );
    }

    if (!call) {
      throw new Error(`Chamada ${callId || '<vazio>'} não encontrada`);
    }

    const callState = call.getState ? call.getState() : call.state;
    if (
      callState !== CALL_STATES?.INCOMING_RING &&
      callState !== "INCOMING_RING" &&
      callState !== CALL_STATES?.ReceivedCall &&
      callState !== 3 &&
      !call.isGroup
    ) {
      throw new Error(`Chamada ${callId || '<vazio>'} não está tocando (estado: ${callState})`);
    }

    const peerJid = call.peerJid || call.peerJid_;
    if (!peerJid) {
      throw new Error("peerJid não encontrado na chamada");
    }

    // Garantir sessão E2E (igual WPP)
    if (ensureE2ESessions && peerJid.isGroupCall && !peerJid.isGroupCall()) {
      await ensureE2ESessions([peerJid]);
    }

    // Obter meu WID (igual WPP: getMyUserWid())
    const me = _fmarkGetMyUserId();

    // Construir node de reject (igual WPP)
    const node = smax(
      "call",
      {
        from: me ? me.toString({ legacy: true }) : undefined,
        to: peerJid.toString({ legacy: true }),
        id: generateId ? generateId() : Array.from(crypto.getRandomValues(new Uint8Array(4))).map(b => b.toString(16).padStart(2, "0")).join(""),
      },
      [
        smax(
          "reject",
          {
            "call-id": call.id,
            "call-creator": peerJid.toString({ legacy: true }),
            count: "0",
          },
          null
        ),
      ]
    );

    await sendSmaxStanza(node);
    console.info("[FMARK] callReject enviado com sucesso");
    return true;
  } catch (err) {
    console.error("[FMARK] Erro em callReject:", err);
    return false;
  }
};

/**
 * Registra um listener para chamadas recebidas (cópia do WPP.on('call.incoming_call')).
 *
 * @param {Function} handler - Função callback que recebe os dados da chamada
 * @returns {Function|false} Função para remover o listener, ou false se não disponível
 *
 * @example
 * ```js
 * const off = FMARK.onIncomingCall((call) => {
 *   console.log('Chamada recebida:', call.id);
 *   console.log('De:', call.sender);
 *   console.log('É vídeo:', call.isVideo);
 *   // Aceitar automaticamente
 *   FMARK.callAccept(call.id);
 *   // Ou rejeitar
 *   // FMARK.callReject(call.id);
 * });
 * // Para remover o listener:
 * // off();
 * ```
 */
window.FMARK.onIncomingCall = function (handler) {
  const Store = window.Store;
  const CallStore = Store.CallStore || Store.CallCollection;
  const CALL_STATES = Store.CALL_STATES;

  if (typeof handler !== "function") {
    console.error("[FMARK] onIncomingCall requer uma função como parâmetro");
    return false;
  }

  // Verificar se CallStore está disponível
  if (!CallStore?.on) {
    console.error("[FMARK] CallStore não disponível para onIncomingCall");
    return false;
  }

  // Função para serializar dados da chamada (igual WPP createWid)
  const serializeCall = (call) => {
    const peerJid = call.peerJid || call.peerJid_;
    return {
      id: call.id,
      isGroup: call.isGroup || false,
      isVideo: call.isVideo || false,
      offerTime: call.offerTime,
      sender: peerJid ? {
        _serialized: peerJid.toString ? peerJid.toString() : peerJid._serialized,
        user: peerJid.user,
        server: peerJid.server,
      } : null,
      peerJid: peerJid,
    };
  };

  // Listener para novas chamadas (grupos) - igual WPP registerIncomingCallEvent
  const onAddListener = (call) => {
    if (call.isGroup) {
      try {
        handler(serializeCall(call));
      } catch (err) {
        console.error("[FMARK] Erro no handler de onIncomingCall:", err);
      }
    }
  };

  // Listener para mudanças de estado (chamadas individuais) - igual WPP
  const onChangeListener = (call) => {
    const state = call.getState ? call.getState() : call.state;
    
    // Fix for mantain compatibility with older versions of whatsapp web (igual WPP)
    if (
      state === CALL_STATES?.INCOMING_RING ||
      state === "INCOMING_RING" ||
      // >= 2.3000.10213.x
      state === CALL_STATES?.ReceivedCall ||
      state === 3
    ) {
      try {
        handler(serializeCall(call));
      } catch (err) {
        console.error("[FMARK] Erro no handler de onIncomingCall:", err);
      }
    }
  };

  // Registrar listeners (igual WPP)
  CallStore.on("add", onAddListener);
  CallStore.on("change", onChangeListener);

  console.info("[FMARK] onIncomingCall registrado com sucesso");

  // Retornar função para remover listeners
  return function () {
    try {
      CallStore.off("add", onAddListener);
      CallStore.off("change", onChangeListener);
      console.info("[FMARK] onIncomingCall removido com sucesso");
    } catch (err) {
      console.error("[FMARK] Erro ao remover onIncomingCall:", err);
    }
  };
};

/**
 * Obtém a lista de chamadas do Store.
 *
 * @returns {Array} Lista de chamadas
 *
 * @example
 * ```js
 * const calls = FMARK.getCalls();
 * console.log(calls);
 * ```
 */
window.FMARK.getCalls = function () {
  const Store = window.Store;
  const CallStore = Store.CallStore || Store.CallCollection;

  if (!CallStore) {
    console.warn("[FMARK] CallStore não disponível");
    return [];
  }

  try {
    const calls = CallStore.models || CallStore._models || [];
    return calls.map((call) => {
      const peerJid = call.peerJid || call.peerJid_;
      return {
        id: call.id,
        isGroup: call.isGroup || false,
        isVideo: call.isVideo || false,
        offerTime: call.offerTime,
        outgoing: call.outgoing || false,
        sender: peerJid ? peerJid.toString() : null,
        state: call.getState ? call.getState() : call.state,
      };
    });
  } catch (err) {
    console.error("[FMARK] Erro em getCalls:", err);
    return [];
  }
};

/**
 * Obtém a chamada ativa no momento.
 *
 * @returns {Object|null} Dados da chamada ativa ou null
 *
 * @example
 * ```js
 * const activeCall = FMARK.getActiveCall();
 * if (activeCall) {
 *   console.log('Chamada ativa:', activeCall.id);
 * }
 * ```
 */
window.FMARK.getActiveCall = function () {
  const Store = window.Store;
  const CallStore = Store.CallStore || Store.CallCollection;

  if (!CallStore?.activeCall) {
    return null;
  }

  try {
    const call = CallStore.activeCall;
    const peerJid = call.peerJid || call.peerJid_;
    return {
      id: call.id,
      isGroup: call.isGroup || false,
      isVideo: call.isVideo || false,
      offerTime: call.offerTime,
      outgoing: call.outgoing || false,
      sender: peerJid ? peerJid.toString() : null,
      state: call.getState ? call.getState() : call.state,
    };
  } catch (err) {
    console.error("[FMARK] Erro em getActiveCall:", err);
    return null;
  }
};

/**
 * Escuta respostas de enquete. Usa apenas Store e módulos internos:
 * - Store.Msg.on("add") para compatibilidade (quando o WA disparar msg de poll).
 * - Hook em upsertVotesDb/upsertVotes (instalado no bootstrap) para votos no WA atual.
 *
 * @example
 * ```js
 * const off = FMARK.onPollResponse((msg) => console.log(msg));
 * // off() para remover
 * ```
 */
window.FMARK.onPollResponse = function (handler) {
  if (typeof handler !== "function") return function () {};
  var offStore = function () {};
  var handlers = window.FMARK._pollResponseHandlers;
  if (handlers) handlers.push(handler);
  if (Store.Msg && Store.Msg.on) {
    var listener = function (msg) {
      if (!msg) return;
      var type = msg.type || msg.subtype;
      if (type === "poll_update" || type === "poll_response" || msg.pollUpdate || msg.selectedOptions) {
        handler(msg);
      }
    };
    Store.Msg.on("add", listener);
    offStore = function () {
      try { Store.Msg.off("add", listener); } catch (_) {}
    };
  }
  return function () {
    offStore();
    if (handlers) {
      var idx = handlers.indexOf(handler);
      if (idx !== -1) handlers.splice(idx, 1);
    }
  };
};

//Funcao adicionada em 18/06/2020 by Mike
window.FMARK.sendSeen = async function (id) {
  if (!id) return false;

  try {
    // Preparar o ID e buscar/criar o chat
    id = typeof id == "string" ? id : id._serialized;
    const userWid = Store.WidFactory.createWid(id);
    const origin = "username_contactless_search";
    const findOpts = { forceUsync: true };

    const chat = await Store.FindChat.findOrCreateLatestChat(userWid, origin, findOpts);

    if (!chat) {
      return false;
    }

    await Store.ReadSeen.sendSeen(chat);
    return true;
  } catch (error) {
    console.error("Error in sendSeen:", error);
    return false;
  }
};

/*
//Apos receber uma mensagem, e nao responder, essa funcao nao funciona de forma isolada
window.FMARK.sendSeen = function(id, done) {
    var chat = window.FMARK.getChat(id);
    if (chat !== undefined) {
        if (done !== undefined) {
            Store.SendSeen(Store.Chat.models[0], false).then(function() {
                done(true);
            });
            return true;
        } else {
            Store.SendSeen(Store.Chat.models[0], false);
            return true;
        }
    }
    if (done !== undefined) done();
    return false;
}; */

/*
//Alterado em 20/02/2020 Creditos: by Lucas
//Apos receber uma mensagem, e nao responder, essa funcao funciona de forma isolada
window.FMARK.sendSeen = function(id, done) {
    let chat = window.FMARK.getChat(id);
    if (chat !== undefined) {
        if (done !== undefined) {
            Store.SendSeen(Store.Chat.models[0], false).then(function() {
                done(true);
            });
            return true;
        } else {
            Store.SendSeen(Store.Chat.models[0], false);
            return true;
        }
    }
    if (done !== undefined) done();
    return false;
}; */

function isChatMessage(message) {
  if (message.isSentByMe) {
    return false;
  }
  if (message.isNotification) {
    return false;
  }
  if (!message.isUserCreatedType) {
    return false;
  }
  return true;
}

window.FMARK.getUnreadMessages = function (includeMe, includeNotifications, use_unread_count, done) {
  const chats = window.Store.Chat._models;
  let output = [];

  for (let chat in chats) {
    if (isNaN(chat)) {
      continue;
    }

    let messageGroupObj = chats[chat];
    let messageGroup = FMARK._serializeChatObj(messageGroupObj);

    messageGroup.messages = [];

    const messages = messageGroupObj.msgs._models;
    for (let i = messages.length - 1; i >= 0; i--) {
      let messageObj = messages[i];
      if (typeof messageObj.isNewMsg != "boolean" || messageObj.isNewMsg === false) {
        continue;
      } else {
        messageObj.isNewMsg = false;
        //Miro Emidio - 05/Dez/2019 Alterado para funcionamento em WHATS empresarial/pessoal
        let message = FMARK.processMessageObj(messageObj, includeMe, false); //includeNotifications);// MUDAR PARA "FALSE" AQUI
        if (message) {
          messageGroup.messages.push(message);
        }
      }
    }

    if (messageGroup.messages.length > 0) {
      output.push(messageGroup);
    } else {
      // no messages with isNewMsg true
      if (use_unread_count) {
        let n = messageGroupObj.unreadCount; // usara o atributo unreadCount para buscar as ultimas n mensagens do remetente
        for (let i = messages.length - 1; i >= 0; i--) {
          let messageObj = messages[i];
          if (n > 0) {
            if (!messageObj.isSentByMe) {
              let message = FMARK.processMessageObj(messageObj, includeMe, includeNotifications);
              messageGroup.messages.unshift(message);
              n -= 1;
            }
          } else if (n === -1) {
            // chat was marked as unread so will fetch last message as unread
            if (!messageObj.isSentByMe) {
              let message = FMARK.processMessageObj(messageObj, includeMe, includeNotifications);
              messageGroup.messages.unshift(message);
              break;
            }
          } else {
            // unreadCount = 0
            break;
          }
        }
        if (messageGroup.messages.length > 0) {
          messageGroupObj.unreadCount = 0; // reset unread counter
          output.push(messageGroup);
        }
      }
    }
  }
  if (done !== undefined) {
    done(output);
  }

  //mike teste 16/02/2021 tentativa de retornar imagem de perfil
  SetConsoleMessage("getUnreadMessages", JSON.stringify(output));
  return output;
};

window.FMARK.openChat = async function (e, t) {
  // Obtém o chat existente usando o identificador 'e'
  const resolved = fmarkResolveChatWidSync(e) || e;
  const chat = await Store.FindChat.findExistingChat(resolved);

  // Verifica se 't' é nulo ou vazio e pega a última mensagem se for o caso
  const mensagem =
    t === null || t === ""
      ? chat.msgs._models[chat.msgs._models.length - 1] // Última mensagem
      : chat.msgs._models.find((msg) => msg.id.id === t); // Mensagem específica

  // Chama o método openChatAt com os parâmetros necessários
  return await Store.Cmd.openChatAt({
    chat: chat,
    msgContext: mensagem ? { id: mensagem.id.id } : null, // Contexto da mensagem
    chatEntryPoint: "Chatlist",
  });
};

window.FMARK.getGroupOwnerID = async function (id, done) {
  const output = (await FMARK.getGroupMetadata(id)).owner.id;
  if (done !== undefined) {
    done(output);
  }

  SetConsoleMessage("getGroupOwnerID", JSON.stringify(output));

  return output;
};

window.FMARK.getCommonGroups = async function (id, done) {
  let output = [];

  groups = window.FMARK.getAllGroups();

  for (let idx in groups) {
    try {
      participants = await window.FMARK.getGroupParticipantIDs(groups[idx].id);
      if (participants.filter((participant) => participant == id).length) {
        output.push(groups[idx]);
      }
    } catch (err) {
      console.log("Error in group:");
      console.log(groups[idx]);
      console.log(err);
    }
  }

  if (done !== undefined) {
    done(output);
  }
  return output;
};

window.FMARK.getProfilePicSmallFromId = function (id, done) {
  window.Store.ProfilePicThumb.find(id).then(
    function (d) {
      if (d.img !== undefined) {
        window.FMARK.downloadFileWithCredentials(d.img, done);
      } else {
        done(false);
      }
    },
    function (e) {
      done(false);
    },
  );
};

function parseDataURL(dataURL) {
  const match = dataURL.match(/^data:(.*?);base64,(.*)$/);

  if (!match) {
    return null; // URL de dados inválido
  }

  const contentType = match[1];
  const base64Data = match[2];
  const byteString = atob(base64Data);
  const buffer = new Uint8Array(byteString.length);

  for (let i = 0; i < byteString.length; i++) {
    buffer[i] = byteString.charCodeAt(i);
  }

  return {
    contentType: contentType,
    data: buffer,
  };
}

// ================== FILE AND MEDIA UTILITIES ==================
window.FMARK.convertToFile = async function (data, mimetype, filename) {
  if (data instanceof File) {
    return data;
  }

  let blob = null;

  if (typeof data === "string") {
    let parsed = parseDataURL(data);

    if (!parsed && isBase64(data)) {
      parsed = parseDataURL("data:;base64," + data);
    }

    if (!parsed) {
      throw "invalid_data_url";
    }

    if (!mimetype) {
      mimetype = parsed.contentType;
    }

    const buffer = parsed.data.buffer;
    blob = new Blob([new Uint8Array(buffer)], {
      type: mimetype,
    });
  } else {
    blob = data;
  }

  if (!filename || !mimetype) {
    // Tentativa de inferir o tipo de arquivo com base no tipo MIME
    const fileExtension = mimetype.split("/")[1];
    filename = filename || `unknown.${fileExtension}`;
    mimetype = mimetype || "application/octet-stream";
  }

  return new File([blob], filename, {
    type: mimetype,
    lastModified: Date.now(),
  });
};

async function resizeImage(file, options) {
  return new Promise((resolve, reject) => {
    const { width, height, mimeType, resize } = options;

    const img = new Image();
    img.src = URL.createObjectURL(file);

    img.onload = function () {
      let newWidth = width;
      let newHeight = height;

      if (resize === "cover") {
        const aspectRatio = img.width / img.height;
        const targetAspectRatio = width / height;

        if (aspectRatio > targetAspectRatio) {
          newHeight = width / aspectRatio;
        } else {
          newWidth = height * aspectRatio;
        }
      }

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = newWidth;
      canvas.height = newHeight;

      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      canvas.toBlob((resizedBlob) => {
        resolve(new File([resizedBlob], file.name, { type: mimeType }));
      }, mimeType);
    };

    img.onerror = function () {
      reject(new Error("Failed to load the image."));
    };
  });
}

async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = function () {
      resolve(reader.result);
    };

    reader.onabort = reject;
    reader.onerror = reject;

    reader.readAsDataURL(blob);
  });
}

window.FMARK.setIconToGroup = async function (id, base64) {
  var userId = new window.Store.UserConstructor(id, {
    intentionallyUsePrivateConstructor: true,
  });
  const file = await window.FMARK.convertToFile(base64);

  const thumbFile = await resizeImage(file, {
    width: 96,
    height: 96,
    mimeType: "image/jpeg",
    resize: "cover",
  });

  const pictureFile = await resizeImage(file, {
    width: 640,
    height: 640,
    mimeType: "image/jpeg",
    resize: "cover",
  });

  const thumbBase64 = await blobToBase64(thumbFile);
  const pictureBase64 = await blobToBase64(pictureFile);
  return await Store.Profile.sendSetPicture(userId, thumbBase64, pictureBase64);
};

window.FMARK.getProfilePicFromId = function (id, done) {
  window.Store.ProfilePicThumb.find(id).then(
    function (d) {
      if (d.imgFull !== undefined) {
        window.FMARK.downloadFileWithCredentials(d.imgFull, done);
      } else {
        done(false);
      }
    },
    function (e) {
      done(false);
    },
  );
};

window.FMARK.downloadFileWithCredentials = function (url, done) {
  let xhr = new XMLHttpRequest();

  xhr.onload = function () {
    if (xhr.readyState == 4) {
      if (xhr.status == 200) {
        let reader = new FileReader();
        reader.readAsDataURL(xhr.response);
        reader.onload = function (e) {
          done(reader.result.substr(reader.result.indexOf(",") + 1));
        };
      } else {
        console.error(xhr.statusText);
      }
    } else {
      console.log(err);
      done(false);
    }
  };

  xhr.open("GET", url, true);
  xhr.withCredentials = true;
  xhr.responseType = "blob";
  xhr.send(null);
};

window.FMARK.downloadFile = function (url, done) {
  let xhr = new XMLHttpRequest();

  xhr.onload = function () {
    if (xhr.readyState == 4) {
      if (xhr.status == 200) {
        let reader = new FileReader();
        reader.readAsDataURL(xhr.response);
        reader.onload = function (e) {
          done(reader.result.substr(reader.result.indexOf(",") + 1));
        };
      } else {
        console.error(xhr.statusText);
      }
    } else {
      console.log(err);
      done(false);
    }
  };

  xhr.open("GET", url, true);
  xhr.responseType = "blob";
  xhr.send(null);
};

window.FMARK.getBatteryLevel = function (done) {
  if (window.Store.Conn.plugged) {
    if (done !== undefined) {
      done(100);
    }
    output = 100;
    return SetConsoleMessage("getBatteryLevel", JSON.stringify(output));
  }
  output = window.Store.Conn.battery;
  if (done !== undefined) {
    done(output);
  }
  SetConsoleMessage("getBatteryLevel", JSON.stringify(output));
  return output;
};

window.FMARK.deleteConversation = async function (chatId) {
  let userId = new window.Store.UserConstructor(chatId, { intentionallyUsePrivateConstructor: true });
  let conversation = FMARK.getChat(userId);
  if (!conversation) {
    return false;
  }
  return await window.Store.sendDelete(conversation, false)
    .then(() => {
      return true;
    })
    .catch(() => {
      return false;
    });
};

window.FMARK.deleteMessage = function (chatId, messageArray, revoke = false, done) {
  let userId = new window.Store.UserConstructor(chatId, {
    intentionallyUsePrivateConstructor: true,
  });
  let getAssert = Store.Chat.assertGet(userId);

  if (!getAssert) {
    if (done !== undefined) {
      done(false);
    }
    return false;
  }

  if (!Array.isArray(messageArray)) {
    messageArray = [messageArray];
  }
  messageArray = messageArray.map((e) => Store.Msg.get(e));

  if (revoke) {
    Store.Cmd.sendRevokeMsgs(
      getAssert,
      {
        type: "message",
        list: messageArray,
      },
      {
        clearMedia: true,
      },
    );
  } else {
    Store.Cmd.sendDeleteMsgs(
      getAssert,
      {
        type: "message",
        list: messageArray,
      },
      false,
    );
  }

  if (done !== undefined) {
    done(true);
  }

  return true;
};

// ================== NEW MESSAGE OBSERVERS ==================
/**
 * New messages observable functions.
 */
window.FMARK._newMessagesQueue = [];
window.FMARK._newMessagesBuffer =
  sessionStorage.getItem("saved_msgs") != null ? JSON.parse(sessionStorage.getItem("saved_msgs")) : [];
window.FMARK._newMessagesDebouncer = null;
window.FMARK._newMessagesCallbacks = [];

window.Store.Msg.off("add");
sessionStorage.removeItem("saved_msgs");

window.FMARK._newMessagesListener = window.Store.Msg.on("add", (newMessage) => {
  if (newMessage && newMessage.isNewMsg && !newMessage.id.fromMe) {
    let message = window.FMARK.processMessageObj(newMessage, false, false);
    if (message) {
      window.FMARK._newMessagesQueue.push(message);
      window.FMARK._newMessagesBuffer.push(message);
    }

    // Starts debouncer time to don t call a callback for each message if more than one message arrives
    // in the same second
    if (!window.FMARK._newMessagesDebouncer && window.FMARK._newMessagesQueue.length > 0) {
      window.FMARK._newMessagesDebouncer = setTimeout(() => {
        let queuedMessages = window.FMARK._newMessagesQueue;

        window.FMARK._newMessagesDebouncer = null;
        window.FMARK._newMessagesQueue = [];

        let removeCallbacks = [];

        window.FMARK._newMessagesCallbacks.forEach(function (callbackObj) {
          if (callbackObj.callback !== undefined) {
            callbackObj.callback(queuedMessages);
          }
          if (callbackObj.rmAfterUse === true) {
            removeCallbacks.push(callbackObj);
          }
        });

        // Remove removable callbacks.
        removeCallbacks.forEach(function (rmCallbackObj) {
          let callbackIndex = window.FMARK._newMessagesCallbacks.indexOf(rmCallbackObj);
          window.FMARK._newMessagesCallbacks.splice(callbackIndex, 1);
        });
      }, 1000);
    }
  }
});

window.FMARK._unloadInform = (event) => {
  // Save in the buffer the ungot unreaded messages
  window.FMARK._newMessagesBuffer.forEach((message) => {
    Object.keys(message).forEach((key) => (message[key] === undefined ? delete message[key] : ""));
  });
  sessionStorage.setItem("saved_msgs", JSON.stringify(window.FMARK._newMessagesBuffer));

  // Inform callbacks that the page will be reloaded.
  window.FMARK._newMessagesCallbacks.forEach(function (callbackObj) {
    if (callbackObj.callback !== undefined) {
      callbackObj.callback({
        status: -1,
        message: "page will be reloaded, wait and register callback again.",
      });
    }
  });
};

window.addEventListener("unload", window.FMARK._unloadInform, false);
window.addEventListener("beforeunload", window.FMARK._unloadInform, false);
window.addEventListener("pageunload", window.FMARK._unloadInform, false);

/**
 * Registers a callback to be called when a new message arrives the FMARK.
 * @param rmCallbackAfterUse - Boolean - Specify if the callback need to be executed only once
 * @param done - function - Callback function to be called when a new message arrives.
 * @returns {boolean}
 */
window.FMARK.waitNewMessages = function (rmCallbackAfterUse = true, done) {
  window.FMARK._newMessagesCallbacks.push({
    callback: done,
    rmAfterUse: rmCallbackAfterUse,
  });
  return true;
};

window.FMARK.checkListNumbers = async function (listNumbers) {
  var asyncQuery = new Store.optionsCheckNumberQuery.USyncQuery();
  var asyncUser = new Store.optionsCheckNumberUser.USyncUser();
  asyncQuery.withUser(asyncUser);
  asyncQuery.users = listNumbers.map((e) => {
    var asyncUser = new Store.optionsCheckNumberUser.USyncUser();
    const wid = Store.WidFactory.createWid(e);
    const isLid = wid.toString().includes("@lid");
    asyncUser.withId(wid);
    /*if (isLid ) {
          asyncUser.withId(wid);
        } else {
          asyncQuery.withContactProtocol();
          asyncUser.withPhone('+' + e);
        }*/
    return asyncUser;
  });
  asyncQuery.withLidProtocol();
  asyncQuery.withBusinessProtocol();
  asyncQuery.withStatusProtocol();
  asyncQuery.withDisappearingModeProtocol();
  return await asyncQuery.execute();
};

/**
 * Reads buffered new messages.
 * @param done - function - Callback function to be called contained the buffered messages.
 * @returns {Array}
 */
window.FMARK.getBufferedNewMessages = function (done) {
  let bufferedMessages = window.FMARK._newMessagesBuffer;
  window.FMARK._newMessagesBuffer = [];
  if (done !== undefined) {
    done(bufferedMessages);
  }
  return bufferedMessages;
};
/** End new messages observable functions **/

// ================== MEDIA SENDING ==================
/**
 * Envia mídia via `MediaCollection` (função legada/compat).
 *
 * Para mais controle (tipo, PTT, forçar documento, etc), use `FMARK.sendMedia` ou `FMARK.sendFileMessage`.
 *
 * @example
 * ```js
 * await FMARK.sendImage('data:image/png;base64,...', '5511...@c.us', 'foto.png', 'Legenda');
 * await FMARK.sendImage('data:video/mp4;base64,...', '5511...@c.us', 'video.mp4', 'Legenda');
 * ```
 *
 * @param {string} imgBase64 DataURL base64 (`data:*;base64,...`).
 * @param {string} chatid ChatId destino.
 * @param {string} filename Nome do arquivo.
 * @param {string} [caption] Legenda.
 * @param {object} [extras] Opções extras (ex: `forceDocument`).
 * @returns {Promise<any>} Retorno legado (compat).
 */
window.FMARK.sendImage = function (imgBase64, chatid, filename, caption, extras = {}) {
  return Promise.resolve(window.FMARK.getLidFromPhoneID(chatid)).then((resolvedId) => {
    const idUser = fmarkEnsureWid(resolvedId || chatid);
    if (!idUser) return false;

    return Store.FindChat.findOrCreateLatestChat(idUser).then((create_chat) => {
      const chat = create_chat?.chat;
      var mediaBlob = window.FMARK.base64ImageToFile(imgBase64, filename);
      var mc = new Store.MediaCollection(chat);
      var blob = Store.getMediaOptions.createFile([mediaBlob], filename, { type: mediaBlob.type });

      const FT = Store.getMediaOptions.FILETYPE;
      const isVcardOverMmsDocument = extras.isVcardOverMmsDocument ?? false;
      const forceDocument = extras.forceDocument === true;
      const mime = mediaBlob?.type || "";
      const ext = filename ? filename.split(".").pop().toLowerCase() : "";

      let mediaType = "image";
      let fileType = FT.IMAGE;

      if (forceDocument) {
        mediaType = "document";
        fileType = FT.DOCUMENT;
      } else if (/^video\//.test(mime) || ["mp4", "mov", "mkv", "webm", "avi"].includes(ext)) {
        mediaType = "video";
        fileType = FT.VIDEO;
      } else if (/^audio\//.test(mime) || ["mp3", "wav", "ogg", "opus", "m4a"].includes(ext)) {
        mediaType = "audio";
        fileType = FT.AUDIO;
      } else if (/^image\//.test(mime) || ["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
        mediaType = "image";
        fileType = FT.IMAGE;
      } else {
        mediaType = "document";
        fileType = FT.DOCUMENT;
      }

      const uploadLimitFn =
        Store.getUploadLimit && typeof Store.getUploadLimit === "function"
          ? Store.getUploadLimit
          : Store.getUploadOptions && typeof Store.getUploadOptions.getUploadLimit === "function"
            ? Store.getUploadOptions.getUploadLimit
            : typeof Store.getUploadOptions === "function"
              ? Store.getUploadOptions
              : null;

      const uploadLimit = uploadLimitFn ? uploadLimitFn(mediaType, null, isVcardOverMmsDocument) : null;

      const useDocument = forceDocument || fileType === FT.DOCUMENT || (uploadLimit && mediaBlob.size > uploadLimit);

      const rawAttach = {
        file: blob,
        type: useDocument ? FT.DOCUMENT : fileType,
        mimetype: blob.type,
      };

      if (useDocument) {
        rawAttach.isVcardOverMmsDocument = isVcardOverMmsDocument;
        rawAttach.documentPageCount = extras.documentPageCount ?? 1;
      }

      mc.processAttachmentsForChat([rawAttach], 1, chat).then(() => {
        let media = mc._models[0];
        media.sendToChat(chat, { caption: caption });
        return true;
      });
    });
  });
};

/**
 * Envia mídia/arquivo escolhendo o tipo e aplicando fallback para documento quando necessário.
 *
 * @example
 * ```js
 * await FMARK.sendMedia('data:video/mp4;base64,...', '5511...@c.us', 'video.mp4', 'Legenda');
 * await FMARK.sendMedia('data:application/pdf;base64,...', '5511...@c.us', 'doc.pdf', '', undefined, { forceDocument: true });
 * ```
 *
 * @param {string} base64Data DataURL base64 (`data:*;base64,...`).
 * @param {string} chatId ChatId destino.
 * @param {string} filename Nome do arquivo.
 * @param {string} [caption] Legenda.
 * @param {any} [type] Tipo/FILETYPE (quando suportado).
 * @param {object} [extras] Opções extras.
 * @returns {Promise<any>} Retorno compat (pode variar no fallback legado).
 */
window.FMARK.sendMedia = async function (base64Data, chatId, filename, caption = "", type = undefined, extras = {}) {
  // Apply video patches for Chromium/headless browser compatibility
  fmarkEnsureVideoPatch();
  
  // 1) Fallback para o método antigo se não houver type nem extras
  if (type === undefined && Object.keys(extras).length === 0) {
    return window.FMARK.sendImage(base64Data, chatId, filename, caption);
  }

  // 2) Resolve o chat
  const resolvedId = await window.FMARK.getLidFromPhoneID(chatId);
  const targetId = resolvedId || chatId;
  if (!targetId) return false;
  const idUser = fmarkEnsureWid(targetId);
  if (!idUser) return false;
  const { created, chat } = await Store.FindChat.findOrCreateLatestChat(idUser);

  // 3) Converte Base64 -> Blob -> OpaqueData (para ter forceToBlob, etc)
  const mediaBlob = window.FMARK.base64ImageToFile(base64Data, filename);
  var blob = Store.getMediaOptions.createFile([mediaBlob], filename, { type: mediaBlob.type });

  // 4) Detecta o tipo se não foi passado
  const FT = Store.getMediaOptions.FILETYPE;
  const forceDocument = extras.forceDocument === true;
  if (forceDocument) {
    type = FT.DOCUMENT;
  }
  if (!type) {
    const ext = filename.split(".").pop().toLowerCase();
    if (/(jpe?g|png)$/i.test(ext)) type = FT.IMAGE;
    else if (ext === "webp") type = FT.STICKER;
    else if (/(mp4|mov|mkv)$/i.test(ext)) type = FT.VIDEO;
    else if (/(mp3|wav)$/i.test(ext)) type = FT.AUDIO;
    else type = FT.DOCUMENT;
  }

  // 5) Monte o array mínimo de “raw attachments”
  const isVcardOverMmsDocument = extras.isVcardOverMmsDocument ?? false;
  const rawAttach = {
    file: blob,
    type: type,
    mimetype: blob.type,
  };
  // se for documento, você pode incluir:
  if (type === FT.DOCUMENT) {
    rawAttach.isVcardOverMmsDocument = isVcardOverMmsDocument;
    rawAttach.documentPageCount = extras.documentPageCount ?? 1;
  }

  const typeMap = new Map();
  typeMap.set(FT.IMAGE, "image");
  typeMap.set(FT.VIDEO, "video");
  typeMap.set(FT.AUDIO, "audio");
  typeMap.set(FT.DOCUMENT, "document");
  typeMap.set(FT.STICKER, "sticker");
  typeMap.set(FT.STICKER_PACK, "sticker-pack");

  let mediaType = typeof type === "string" ? type.toLowerCase() : typeMap.get(type);
  if (!mediaType) {
    mediaType = "document";
  }

  const uploadLimitFn =
    Store.getUploadLimit && typeof Store.getUploadLimit === "function"
      ? Store.getUploadLimit
      : Store.getUploadOptions && typeof Store.getUploadOptions.getUploadLimit === "function"
        ? Store.getUploadOptions.getUploadLimit
        : typeof Store.getUploadOptions === "function"
          ? Store.getUploadOptions
          : null;

  const uploadLimit = uploadLimitFn ? uploadLimitFn(mediaType, null, isVcardOverMmsDocument) : null;

  if (!forceDocument && uploadLimit && mediaBlob.size > uploadLimit) {
    rawAttach.type = FT.DOCUMENT;
    rawAttach.isVcardOverMmsDocument = isVcardOverMmsDocument;
    rawAttach.documentPageCount = extras.documentPageCount ?? 1;
  }

  // 6) Envia direto pelo MediaCollection
  const mc = new Store.MediaCollection(chat);
  const origin = 1; // ou use o enum WAWebWamEnumMediaPickerOriginType se quiser
  await mc.processAttachmentsForChat([rawAttach], origin, chat);

  // 7) Recupere o model e mande
  const media = mc._models[0];
  await media.sendToChat(chat, { caption });

  return true;
};

//
window.FMARK.sendVideo = function (imgBase64, chatid, filename, caption) {
  // Apply video patches for Chromium/headless browser compatibility
  fmarkEnsureVideoPatch();
  
  return Promise.resolve(window.FMARK.getLidFromPhoneID(chatid)).then((resolvedId) => {
    const idUser = fmarkEnsureWid(resolvedId || chatid);
    if (!idUser) return false;

    return Store.FindChat.findOrCreateLatestChat(idUser).then((create_chat) => {
      const chat = create_chat?.chat;
      var mediaBlob = window.FMARK.base64ImageToFile(imgBase64, filename);
      var mc = new Store.MediaCollection(chat);
      var blob = Store.getMediaOptions.createFile([mediaBlob], filename, { type: mediaBlob.type });
      mc.processAttachmentsForChat(
        [
          {
            file: blob,
            type: "video",
            mimetype: "video/mp4",
            isVcardOverMmsDocument: false,
            documentPageCount: 1,
          },
        ],
        1,
        chat,
      ).then(() => {
        let media = mc._models[0];
        media.sendToChat(chat, { caption: caption });
        return true;
      });
    });
  });
};

/*


window.FMARK.sendImageList([{imgBase64: "data:video/mp4,XXXXX", nameFile: "video.mp4", caption: "Hello"}], "[number]@c.us")



*/

window.FMARK.sendImageList = function (imgBase64List, chatid) {
  var baseConvert = imgBase64List.map((e) => {
    var mediaBlob = window.FMARK.base64ImageToFile(e.imgBase64, e.nameFile ?? "");
    var blob = Store.getMediaOptions.createFile([mediaBlob], e.nameFile, { type: mediaBlob.type });
    return {
      file: blob,
    };
  });
  console.log(baseConvert);
  return Promise.resolve(window.FMARK.getLidFromPhoneID(chatid)).then((resolvedId) => {
    const idUser = fmarkEnsureWid(resolvedId || chatid);
    if (!idUser) return false;

    return Store.FindChat.findOrCreateLatestChat(idUser).then((create_chat) => {
      const chat = create_chat?.chat;
      var mc = new Store.MediaCollection(chat);

      mc.processAttachmentsForChat(baseConvert, 1, chat).then(() => {
        mc._models.forEach((media, index) => {
          media.sendToChat(chat, { caption: imgBase64List[index]?.caption ?? "" });
        });
        return true;
      });
    });
  });
};

window.FMARK.sendMessageToID = async function (chatid, msgText) {
  try {
    const resolvedId = await window.FMARK.getLidFromPhoneID(chatid);
    var idUser = new window.Store.UserConstructor(resolvedId || chatid, {
      intentionallyUsePrivateConstructor: true,
    });

    const { chat, created } = await window.Store.FindChat.findOrCreateLatestChat(idUser, "newChatFlow", {
      forceUsync: true,
    });

    new Store.SendTextMsgToChat(chat, msgText);

    return true;
  } catch (e) {
    return false;
  }
};

window.FMARK.base64ImageToFile = function (b64Data, filename) {
  var arr = b64Data.split(",");
  var mime = arr[0].match(/:(.*?);/)[1];
  var bstr = atob(arr[1]);
  var n = bstr.length;
  var u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new File([u8arr], filename, {
    type: mime,
  });
};

function base64ToFile(base64String, fileName, mimeType) {
  // Divide a string base64 em duas partes: cabeçalho de dados e dados em si
  const parts = base64String.split(";base64,");
  const contentType = mimeType || (parts[0] && parts[0].split(":")[1]) || "";

  // Decodifica os dados base64 para bytes
  const decodedData = atob(parts[1]);

  // Converte os bytes para um array Uint8
  const dataArray = new Uint8Array(decodedData.length);
  for (let i = 0; i < decodedData.length; i++) {
    dataArray[i] = decodedData.charCodeAt(i);
  }

  // Cria um objeto Blob a partir dos dados
  return new Blob([dataArray], { type: contentType });
}

function addOpusCodecToDataURI(dataURI) {
  if (dataURI.startsWith("data:audio/ogg")) {
    dataURI = dataURI.replace("data:audio/ogg", "data:audio/ogg;codecs=opus");
  }
  return dataURI;
}

window.FMARK.sendPtt = async function (imgBase64, chatid) {
  const resolvedId = await window.FMARK.getLidFromPhoneID(chatid);
  var idUser = fmarkEnsureWid(resolvedId || chatid);
  if (!idUser) return false;
  imgBase64 = addOpusCodecToDataURI(imgBase64);
  return Store.FindChat.findOrCreateLatestChat(idUser).then((create_chat) => {
    const chat = create_chat?.chat;
    var mediaBlob = window.FMARK.base64ImageToFile(imgBase64, "");
    var mc = new Store.MediaCollection(chat);
    mc.processAttachmentsForChat([{ file: mediaBlob }], 1, chat).then(async () => {
      let media = mc._models[0];
      media.mediaPrep.mediaData.type = "ptt";
      media.mediaPrep.mediaData.waveform = await window.FMARK.generateWaveform(mediaBlob);
      media.sendToChat(chat, {});
      return true;
    });
  });
};

window.FMARK.generateWaveform = async (audioFile) => {
  try {
    const audioData = await audioFile.arrayBuffer();
    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(audioData);

    const rawData = audioBuffer.getChannelData(0);
    const samples = 64;
    const blockSize = Math.floor(rawData.length / samples);
    const filteredData = [];
    for (let i = 0; i < samples; i++) {
      const blockStart = blockSize * i;
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum = sum + Math.abs(rawData[blockStart + j]);
      }
      filteredData.push(sum / blockSize);
    }

    const multiplier = Math.pow(Math.max(...filteredData), -1);
    const normalizedData = filteredData.map((n) => n * multiplier);

    const waveform = new Uint8Array(normalizedData.map((n) => Math.floor(100 * n)));

    return waveform;
  } catch (e) {
    return undefined;
  }
};

/**
 * Send contact card to a specific chat using the chat ids
 *
 * @param {string} to '000000000000@c.us'
 * @param {string|array} contact '111111111111@c.us' | ['222222222222@c.us', '333333333333@c.us, ... 'nnnnnnnnnnnn@c.us']
 */
window.FMARK.sendContact = function (to, contact) {
  if (!Array.isArray(contact)) {
    contact = [contact];
  }
  contact = contact.map((c) => {
    return FMARK.getChat(c).__x_contact;
  });

  if (contact.length > 1) {
    window.FMARK.getChat(to).sendContactList(contact);
  } else if (contact.length === 1) {
    window.FMARK.getChat(to).sendContact(contact[0]);
  }
};

/**
 * Create an chat ID based in a cloned one
 *
 * @param {string} chatId '000000000000@c.us'
 */
window.FMARK.getNewMessageId = function (chatId) {
  var newMsgId = Store.Msg._models[0].__x_id.clone();

  newMsgId.fromMe = true;
  newMsgId.id = FMARK.getNewId().toUpperCase();
  newMsgId.remote = chatId;
  newMsgId._serialized = `${newMsgId.fromMe}_${newMsgId.remote}_${newMsgId.id}`;

  return newMsgId;
};

// Builds a base message payload for addAndSendMsgToChat calls.
function fmarkBuildMessageBase(options) {
  const msg = {
    ack: typeof options.ack === "number" ? options.ack : 0,
    id: options.id,
    from: options.from,
    to: options.to,
    t: typeof options.t === "number" ? options.t : Math.floor(Date.now() / 1000),
    isNewMsg: options.isNewMsg !== false,
    type: options.type,
    self: options.self || "out",
  };

  if (options.body !== undefined) {
    msg.body = options.body;
  }
  if (options.local !== undefined) {
    msg.local = options.local;
  }

  return msg;
}

/**
 * Send VCARD
 *
 * @param {string} chatId '000000000000@c.us'
 * @param {string} vcard vcard as a string
 * @param {string} contactName The display name for the contact. CANNOT BE NULL OTHERWISE IT WILL SEND SOME RANDOM CONTACT FROM YOUR ADDRESS BOOK.
 * @param {string} contactNumber If supplied, this will be injected into the vcard (VERSION 3 ONLY FROM VCARDJS) with the WA id to make it show up with the correct buttons on WA.
 */

window.FMARK.PushListNumberStatus = async function (id) {
  try {
    var wid_check = Store.WidFactory.createWid(id);
    var result = await Store.checkNumberOptions.queryWidExists(wid_check);
    var check_result = !!(result && result.wid !== undefined);
    var serialized_id = check_result && result.wid ? result.wid._serialized : id;

    window.statuses.push(serialized_id + ";" + check_result);
  } catch (error) {
    console.error("Erro em PushListNumberStatus:", error);
    window.statuses.push(id + ";false");
  }
};

window.FMARK.sendVCard = async function (chatId, contactNumber, contactName) {
  const resolvedId = await window.FMARK.getLidFromPhoneID(chatId);
  var idUser = new window.Store.UserConstructor(resolvedId || chatId, {
    intentionallyUsePrivateConstructor: true,
  });

  const inChat = await FMARK.getContact(chatId);
  const cont = await FMARK.getContact(contactNumber);
  const newMsgId = await FMARK.getNewMessageId(chatId);

  // console.log(Store.addAndSendMsgToChat)
  // console.log(cont)

  if (!cont) {
    return;
  }

  console.log(cont);

  var cont2 = cont;
  cont2.userid = contactNumber.substring(0, contactNumber.length - 5);

  let queue = Store.Chat.get(chatId);

  const create_chatt = await Store.FindChat.findOrCreateLatestChat(idUser);
  const chat = create_chat?.chat;

  // chat.addQueue = queue.addQueue
  // chat.addQueue.enqueue = queue.addQueue.__proto__.enqueue
  // // chat.msgs = queue.msgs
  // // chat.msgs.add = queue.msgs.__proto__.add
  // chat.sendQueue = queue.sendQueue
  // chat.sendQueue.enqueue = queue.sendQueue.__proto__.enqueue

  const newchat = Object.assign(chat, queue);

  // chat.lastReceivedKey._serialized = inChat._serialized;
  // chat.lastReceivedKey.id = inChat.id;

  // var tempMsg = Object.create(Store.Msg.models.filter(msg => msg.__x_isSentByMe && !msg.quotedMsg)[0]);
  const fromWid = await window.Store.Conn.wid;
  const name = !contactName ? cont.__x_formattedTitle : contactName;
  const body = await window.Store.Vcard.vcardFromContactModel(cont2);
  console.log(body.vcard);

  var message = fmarkBuildMessageBase({
    id: newMsgId,
    from: fromWid,
    to: newchat.id,
    self: "in",
    type: "vcard",
    body: body.vcard,
  });
  message.isQuotedMsgAvailable = false;
  message.vcardFormattedName = name;
  // Object.assign(tempMsg, extend);
  console.log(Store.addAndSendMsgToChat);
  return (await Promise.all(Store.addAndSendMsgToChat(newchat, message)))[1] == "success";
};

// ================== CUSTOM UTILITIES ==================
/**
 * Block contact
 * @param {string} id '000000000000@c.us'
 * @param {*} done - function - Callback function to be called when a new message arrives.
 */
window.FMARK.contactBlock = function (id, done) {
  const contact = window.Store.Contact.get(id);
  if (contact !== undefined) {
    contact.setBlock(!0);
    done(true);
    return true;
  }
  done(false);
  return false;
};
/**
 * unBlock contact
 * @param {string} id '000000000000@c.us'
 * @param {*} done - function - Callback function to be called when a new message arrives.
 */
window.FMARK.contactUnblock = function (id, done) {
  const contact = window.Store.Contact.get(id);
  if (contact !== undefined) {
    contact.setBlock(!1);
    done(true);
    return true;
  }
  done(false);
  return false;
};

/** Joins a group via the invite link, code, or message
 * @param link This param is the string which includes the invite link or code. The following work:
 * - Follow this link to join my WA group: https://chat.whatsapp.com/DHTGJUfFJAV9MxOpZO1fBZ
 * - https://chat.whatsapp.com/DHTGJUfFJAV9MxOpZO1fBZ
 * - DHTGJUfFJAV9MxOpZO1fBZ
 * @returns Promise<string | boolean> Either false if it didn't work, or the group id.
 */
window.FMARK.joinGroupViaLink = async function (link) {
  let code = link;
  //is it a link? if not, assume it's a code, otherwise, process the link to get the code.
  if (link.includes("chat.whatsapp.com")) {
    if (!link.match(/chat.whatsapp.com\/([\w\d]*)/g).length) return false;
    code = link.match(/chat.whatsapp.com\/([\w\d]*)/g)[0].replace("chat.whatsapp.com\/", "");
  }
  const group = await Store.GroupInvite.joinGroupViaInvite(code);
  if (!group.id) return false;
  return group.id._serialized;
};

window.FMARK.GrabAllGroupsId = function GrabAllGroupsId() {
  var text = "";
  var groups = window.FMARK.getAllGroups();
  for (var i = 0; i < groups.length; i++) {
    text += "+" + groups[i].__x_id.user + ", ";
  }
  return text;
};

window.FMARK.GrabAllGroupsIdExist = async function () {
  var text = "";
  var groups = window.FMARK.GrabAllGroupsId();
  var groupssplit = groups.trim().split(",");
  for (let i = 0; i < groupssplit.length - 1; i = i + 1) {
    try {
      groupssplit[i] = groupssplit[i].replace("+", "").trim() + "@g.us";
      var groupmeta = await window.FMARK._getGroupParticipants(groupssplit[i]);
      console.log(groupmeta);
      for (var p = 0; p < groupmeta._models.length; p++) {
        if (Store.UserPrefs.getMaybeMePnUser().user == groupmeta._models[p].id.user) {
          text += groupssplit[i] + ",";
          break;
        }
      }
    } catch (e) {
      continue;
    }
  }
  return await text;
};

window.FMARK.AdmGroupReturn = async function () {
  var text = "";
  var groups = window.FMARK.GrabAllGroupsId();
  var groupssplit = groups.trim().split(",");
  for (let i = 0; i < groupssplit.length - 1; i = i + 1) {
    try {
      groupssplit[i] = groupssplit[i].replace("+", "").trim() + "@g.us";
      console.log(groupssplit[i]);
      var groupmeta = await window.FMARK.getGroupAdmins(groupssplit[i]);
    } catch (e) {
      continue;
    }

    var p1 = "";
    console.log(groupmeta);
    var isAdmin = groupmeta.filter((p) => p.user == Store.UserPrefs.getMaybeMePnUser().user.replace("@c.us", ""));
    if (isAdmin.length != 0) {
      text += groupssplit[i] + ", ";
    }
  }
  return await text;
};

window.FMARK.infogroup = async function (id) {
  var p1 = "";
  var text = "";
  var info = window.FMARK.getGroupMetadata(id);
  await info.then((res) => {
    p1 = res;
  });
  var groupphoto = await window.Store.ProfilePicThumb.find(id);
  text += p1.subject + ";;";
  text += p1.__x_desc + ";;";
  text += p1.participants._models.length + ";;";
  text += p1.__x_id.user + ";;";
  text += p1.__x_announce + ";;";
  text += p1.__x_restrict + ";;";
  text += groupphoto.__x_img;
  return text;
};

window.FMARK.infogroup1 = async function (id) {
  try {
    var p1 = "";
    var text = "";
    var info = window.FMARK.getGroupMetadata(id);
    await info.then((res) => {
      p1 = res;
    });
    var groupphoto = await window.Store.ProfilePicThumb.find(id);
    text += p1.subject + ";;";
    text += p1.__x_desc + ";;";
    text += p1.participants._models.length + ";;";
    text += p1.__x_id.user + ";;";
    text += p1.__x_announce + ";;";
    text += p1.__x_restrict + ";;";
    text += groupphoto.__x_img;
    window.groups.push(text);
  } catch (e) {
    console.log(e);
  }
};

window.FMARK.infoMyGroupList = async function () {
  try {
    var myGroupIds = window.FMARK.getMyGroups();
    var groupList = await Promise.all(
      myGroupIds.map(async (groupId) => {
        try {
          var getId = new Store.WidFactory.createWid(groupId);
          var create_chat = await Store.FindChat.findOrCreateLatestChat(getId, "debugOpenChatFlow", {
            forceUsync: true,
          });
          const groupInfo = create_chat?.chat;
          var groupPhoto = await window.Store.ProfilePicThumb.get(groupId);

          var groupJson = {
            id: groupId,
            subject: groupInfo.groupMetadata?.subject,
            description: groupInfo.groupMetadata?.desc,
            participantsCount: groupInfo.groupMetadata?.participants?.length,
            userId: groupInfo.groupMetadata?.id?.user,
            announcement: groupInfo.isAnnounceGrpRestrict,
            restrict: groupInfo.groupMetadata?.restrict,
            groupPhoto: groupPhoto?.img,
          };

          console.log(groupJson);
          return groupJson;
        } catch (e) {
          console.error(`Error fetching info for group ${groupId}: ${e}`);
          return null;
        }
      }),
    );

    return JSON.stringify(groupList.filter((group) => group !== null));
  } catch (e) {
    console.error(e);
  }
};

window.FMARK.infoAllGroupList = async function () {
  try {
    if (
      !Store ||
      !Store.GroupMetadata ||
      !Store.WidFactory ||
      !Store.FindChat ||
      !Store.Chat ||
      !Store.ProfilePicThumb
    ) {
      console.error("Required WhatsApp Web Store components are not available");
      return JSON.stringify({ error: "WhatsApp Web Store components unavailable" });
    }

    const myGroupIds = Store.GroupMetadata.map((e) => e?.id?._serialized).filter(Boolean);

    const groupList = await Promise.all(
      myGroupIds.map(async (groupId) => {
        try {
          // 1) Cria o WID
          const wid = Store.WidFactory.createWid(groupId);
          if (!wid) {
            console.warn(`Could not create WID for ${groupId}`);
            return null;
          }

          // 2) Tenta achar ou criar o chat
          let chat;
          try {
            const result = await Store.FindChat.findOrCreateLatestChat(wid, "debugOpenChatFlow", { forceUsync: true });
            chat = result.chat;
          } catch (err) {
            console.warn(`FindChat failed for ${groupId}, falling back to Store.Chat.get:`, err);
            chat = Store.Chat.get(wid);
          }

          if (!chat || !chat.groupMetadata) {
            console.warn(`No chat or metadata for ${groupId}`);
            return null;
          }

          // 3) Tenta buscar a foto
          let groupPhoto = "";
          try {
            const thumb = await Store.ProfilePicThumb.get(groupId);
            groupPhoto = thumb?.img || "";
          } catch (_) {
            console.info(`No photo for group ${groupId}`);
          }

          // 4) Monta objeto de saída
          return {
            id: groupId,
            subject: chat.groupMetadata.subject || "",
            description: chat.groupMetadata.desc || "",
            isAdmin: !!chat.groupMetadata.participants.iAmAdmin?.(),
            participantsCount: chat.groupMetadata.participants.length || 0,
            userId: chat.groupMetadata.id.user || "",
            announcement: !!chat.isAnnounceGrpRestrict,
            restrict: !!chat.groupMetadata.restrict,
            groupPhoto,
          };
        } catch (e) {
          console.error(`Error processing group ${groupId}:`, e);
          return null;
        }
      }),
    );

    return JSON.stringify(groupList.filter((g) => g));
  } catch (e) {
    console.error("Fatal error in infoAllGroupList:", e);
    return JSON.stringify({ error: e.message });
  }
};

window.FMARK.alterednamegroup = async function (IdGroup, NewName) {
  const chat = window.Store.WidFactory.createWid(IdGroup);
  Store.setGroupOptions.setGroupSubject(chat, NewName);
};

window.FMARK.getmembers = async function (id) {
  var p1 = "";
  var text = "";
  var idgroups = window.FMARK._getGroupParticipants(id);
  await idgroups.then((res) => {
    p1 = res;
  });
  for (var i = 0; i < p1._models.length; i++) {
    text += p1._models[i].__x_id._serialized + ",";
  }

  return text;
};

window.FMARK.getmembersList = async function (id) {
  return JSON.stringify(
    await Store.GroupMetadata.get(id)
      .participants.getModelsArray()
      .map((e) => e.contact.phoneNumber._serialized ?? e.id._serialized),
  );
};

window.FMARK.GrabContactsGroup = function () {
  try {
    const activeChat = Store.Chat.getActive();

    if (!activeChat?.id.isGroup()) {
      return "";
    }

    const participants = activeChat.groupMetadata.participants._models;
    const contacts = participants
      .map((part) => {
        try {
          const contact = part?.__x_contact || part?.contact;
          const contactId = contact?.id || part?.id;

          if (!contactId) return null;

          const numero =
            part?.__x_contact?.__x_phoneNumber?.user || contact?.phoneNumber?.user || contact?.__x_phoneNumber?.user;

          if (numero) {
            const cleanNumber = numero.replace(/\D/g, "");
            if (cleanNumber.length >= 8 && cleanNumber.length <= 15) {
              return "+" + cleanNumber;
            }
          }

          const isLid = contactId.isLid && contactId.isLid();
          if (isLid) {
            return contactId._serialized;
          }

          const userId = contactId.user || contactId._serialized?.split("@")[0];
          if (userId) {
            const cleanUserId = userId.replace(/\D/g, "");
            if (cleanUserId.length >= 8 && cleanUserId.length <= 15) {
              return "+" + cleanUserId;
            }
          }

          return null;
        } catch (err) {
          return null;
        }
      })
      .filter(Boolean);

    return contacts.join(",");
  } catch (error) {
    return "";
  }
};


window.FMARK.altered = async function () {
  var text = "";
  var contacts = await window.FMARK.getAllContacts();
  for (var i = 0; i < contacts.length; i++) {
    var test = contacts[i].id.split("@");
    if (test[1] != "g.us" || test[1] != "lid") {
      text += contacts[i].id + ",";
    }
  }
  return text;
};

window.FMARK.GrabGroup = async function () {
  var group = document.getElementsByClassName("_1-FMR message-in focusable-list-item");
  var idgroup = window.FMARK.GrabNumber();
  return idgroup + ",";
};
window.FMARK.GrabNumber = function () {
  return Store.Chat.getActive().id._serialized;
};
window.FMARK.GrabNameGroup = async function (id) {
  var p1 = "";
  var infogroup = window.FMARK.getGroupMetadata(id);
  await infogroup.then((res) => {
    p1 = res;
  });
  return p1.__x_subject;
};

function fmarkNormalizeParticipantIds(contactsId) {
  let ids = Array.isArray(contactsId) ? contactsId : [contactsId];
  ids = ids
    .map((id) => {
      if (!id) return null;
      if (typeof id === "string") return id;
      if (id._serialized) return id._serialized;
      if (id.user && id.server) return `${id.user}@${id.server}`;
      return null;
    })
    .filter(Boolean);

  return ids.map((id) => (id.includes("@") ? id : `${id}@c.us`));
}

async function fmarkGetGroupChat(groupId) {
    let chat = Store.Chat.assertGet(groupId);
    const isGroup = chat && (chat.isGroup || (chat.id && chat.id.isGroup && chat.id.isGroup()));
    if (!isGroup) return null;
    return chat;
}

function fmarkHasGroupPermission(groupChat, allowMemberAdd) {
  const metadata = groupChat?.groupMetadata;
  const participants = metadata?.participants;
  const isAdmin = participants?.iAmAdmin && participants.iAmAdmin();

  if (isAdmin) return true;
  if (allowMemberAdd && metadata?.memberAddMode === "all_member_add") {
    return true;
  }
  return false;
}

function fmarkGetParticipantModels(groupChat, wids) {
  const participantsStore = groupChat?.groupMetadata?.participants;
  if (!participantsStore || !Array.isArray(wids)) return [];

  const toKey = (wid) => {
    if (!wid) return null;
    if (typeof wid === "string") return wid;
    if (wid._serialized) return wid._serialized;
    if (typeof wid.toString === "function") return wid.toString();
    return null;
  };

  const resolveFromStore = (wid) => {
    if (!participantsStore?.get) return null;
    return (
      participantsStore.get(wid) ||
      participantsStore.get(toKey(wid)) ||
      participantsStore.get(wid?._serialized)
    );
  };

  const fallbackFind = (wid) => {
    const key = toKey(wid);
    if (!key) return null;
    const models =
      (participantsStore.getModelsArray && participantsStore.getModelsArray()) ||
      participantsStore._models ||
      [];
    return models.find((p) => {
      const id = p?.contact?.phoneNumber;
      const pid = toKey(id);
      return pid === key || pid === (key._serialized || key);
    }) || null;
  };

  return wids
    .map((wid) => resolveFromStore(wid) || fallbackFind(wid))
    .filter(Boolean);
}

function fmarkCompareVersion(a, b) {
  const pa = String(a || "")
    .split(".")
    .map((n) => parseInt(n, 10) || 0);
  const pb = String(b || "")
    .split(".")
    .map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);

  for (let i = 0; i < len; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

function fmarkIsVersionAtLeast(current, target) {
  return fmarkCompareVersion(current, target) >= 0;
}

function fmarkEnsureWid(value) {
  try {
    if (!value) return null;
    if (value.isWidlike || typeof value.isUser === "function" || typeof value.isLid === "function") {
      return value;
    }
    if (typeof value === "string") {
      if (!Store?.WidFactory) return null;
      if (value.includes("@")) return Store.WidFactory.createWid(value);
      if (Store.WidFactory.createUserWid) return Store.WidFactory.createUserWid(value);
      return Store.WidFactory.createWid(`${value}@c.us`);
    }
    if (value._serialized && Store?.WidFactory?.createWid) {
      return Store.WidFactory.createWid(value._serialized);
    }
    if (value.toString && typeof value.toString === "function") {
      const asString = value.toString();
      if (typeof asString === "string" && asString.includes("@") && Store?.WidFactory?.createWid) {
        return Store.WidFactory.createWid(asString);
      }
    }
  } catch {}
  return null;
}

function fmarkIsLidMigrationEnabled() {
  try {
    const gating = Store.Lid1X1MigrationGating?.Lid1X1MigrationUtils;
    if (gating && typeof gating.isLidMigrated === "function") {
      return !!gating.isLidMigrated();
    }
  } catch {}
  return true;
}

function fmarkGetPnFromLid(lid) {
  const lidWid = fmarkEnsureWid(lid);
  if (!lidWid) return null;

  try {
    if (Store.ApiContact?.getPhoneNumber) {
      const pn = Store.ApiContact.getPhoneNumber(lidWid);
      if (pn) return pn;
    }
  } catch {}

  try {
    if (Store.WeblidPnCache?.getPhoneNumber) {
      const pn = Store.WeblidPnCache.getPhoneNumber(lidWid);
      if (pn) return pn;
    }
  } catch {}

  return null;
}

function fmarkGetCurrentLid(wid) {
  const normalized = fmarkEnsureWid(wid) || wid;
  if (!normalized) return null;

  try {
    if (typeof normalized.isLid === "function" && normalized.isLid()) {
      return normalized;
    }
  } catch {}

  try {
    const toUserLid = Store.LidMigrationUtils?.toUserLid || Store.toUserLid;
    if (toUserLid) {
      const lid = toUserLid(normalized);
      if (lid) return fmarkEnsureWid(lid) || lid;
    }
  } catch {}

  try {
    if (Store.WeblidPnCache?.getCurrentLid) {
      const lid = Store.WeblidPnCache.getCurrentLid(normalized);
      if (lid) return fmarkEnsureWid(lid) || lid;
    }
  } catch {}

  try {
    if (Store.ApiContact?.getCurrentLid) {
      const lid = Store.ApiContact.getCurrentLid(normalized);
      if (lid) return fmarkEnsureWid(lid) || lid;
    }
  } catch {}

  try {
    const contact = Store.Contact?.get(normalized) || Store.Contact?.get(normalized.toString && normalized.toString());
    const lidInfo = contact?.getCurrentLidContact?.();
    if (lidInfo?.lid) return fmarkEnsureWid(lidInfo.lid) || lidInfo.lid;
  } catch {}

  return null;
}

function fmarkResolveChatWidSync(value) {
  const wid = fmarkEnsureWid(value);
  if (!wid) return null;

  try {
    if (typeof wid.isGroup === "function" && wid.isGroup()) {
      return wid;
    }
  } catch {}

  const isLid = typeof wid.isLid === "function" && wid.isLid();
  if (isLid && !fmarkIsLidMigrationEnabled()) {
    const pn = fmarkGetPnFromLid(wid);
    return fmarkEnsureWid(pn) || wid;
  }

  if (typeof wid.isUser === "function" && wid.isUser()) {
    if (fmarkIsLidMigrationEnabled()) {
      const lid = fmarkGetCurrentLid(wid);
      return fmarkEnsureWid(lid) || wid;
    }
  }

  return wid;
}

/**
 * Adiciona um ou mais participantes em um grupo.
 *
 * @example
 * ```js
 * await FMARK.addParticipant('1203630...@g.us', '5511999999999@c.us');
 * await FMARK.addParticipant('1203630...@g.us', ['5511...@c.us', '5512...@c.us']);
 * ```
 *
 * @param {string|object} groupId ID do grupo (`...@g.us`).
 * @param {string|Array<string>} contactsId Participante(s) (`...@c.us`) ou números.
 * @returns {Promise<boolean>} `true` se executado, senão `false`.
 */
window.FMARK.addParticipant = async function (groupId, contactsId) {
    try {
        if (!groupId || !contactsId || !window.Store?.WidFactory) return false;

        const ids = fmarkNormalizeParticipantIds(contactsId);
        if (!ids.length) return false;

        const groupChat = await fmarkGetGroupChat(groupId);
        if (!groupChat) return false;
        if (!fmarkHasGroupPermission(groupChat, true)) return false;

        const canAdd_ = groupChat.groupMetadata?.participants;
        if (typeof canAdd_.canAdd === 'function' && !canAdd_.canAdd.call(groupChat.groupMetadata.participants)) {
            return false;
        }

        if (Store.OptionsParticipants?.addParticipants) {
            const participants = ids.map((jid) => {
                try {
                    const wid = Store.WidFactory.createWid(jid);
                    let contact = Store.Contact.getFilteredContacts({}).find((e) => e.id === wid);
                    return contact || null;
                } catch (err) {
                    console.log("Erro ao montar participante:", jid, err);
                    return null;
                }
            }).filter(Boolean);

            if (!participants.length) {
                console.log("Nenhum participante valido encontrado para adicionar.");
                return false;
            }

            const result = await Store.OptionsParticipants.addParticipants(groupChat, participants);
            return result !== false;
        }

        return false;

    } catch (err) {
        console.error("Erro FMARK.addParticipant:", err);
        return false;
    }
};

/**
 * Remove um ou mais participantes de um grupo.
 *
 * @example
 * ```js
 * await FMARK.removeParticipant('1203630...@g.us', '5511999999999@c.us');
 * await FMARK.removeParticipant('1203630...@g.us', ['5511...@c.us', '5512...@c.us']);
 * ```
 *
 * @param {string|object} groupId ID do grupo (`...@g.us`).
 * @param {string|Array<string>} contactsId Participante(s).
 * @returns {Promise<boolean>} `true` se executado, senão `false`.
 */
window.FMARK.removeParticipant = async function (groupId, contactsId) {
  try {
    if (!groupId || !contactsId || !window.Store?.WidFactory) return false;

    const ids = fmarkNormalizeParticipantIds(contactsId);
    if (!ids.length) return false;

    const groupChat = await fmarkGetGroupChat(groupId);
    if (!groupChat) return false;
    if (!fmarkHasGroupPermission(groupChat, false)) return false;

    const wids = ids.map((id) => Store.WidFactory.createWid(id));
    const participants = fmarkGetParticipantModels(groupChat, wids);
    if (!participants.length) return false;

    const participantsStore = groupChat.groupMetadata?.participants;
    if (participantsStore?.canRemove && typeof participantsStore.canRemove === "function") {
      const allAllowed = participants.every((p) => participantsStore.canRemove(p));
      if (!allAllowed) return false;
    }

    if (Store.OptionsParticipants?.removeParticipants) {
      const result = await Store.OptionsParticipants.removeParticipants(groupChat, participants);
      return result !== false;
    }

    return false;
  } catch (err) {
    console.error("Erro ao remover participante:", err);
    return false;
  }
};

window.FMARK.setGroupDescription = async function (groupId, description) {
  if (typeof description != "string" || description.length === 0) {
    return "It is necessary to write a text!";
  }
  const chatWid = window.Store.Chat.get(groupId);
  let newId = await window.Store.MsgKey.newId_DEPRECATED();
  if (chatWid.groupMetadata.desc == description) {
    return;
  }
  await Store.sendSetGroupProperty.setGroupDescription(chatWid.id, description, newId, chatWid.groupMetadata.descId);
  return true;
};

/**
 * Promove participante(s) a admin em um grupo.
 *
 * @example
 * ```js
 * await FMARK.promoteParticipant('1203630...@g.us', '5511999999999@c.us');
 * ```
 *
 * @param {string|object} groupId ID do grupo (`...@g.us`).
 * @param {string|Array<string>} contactsId Participante(s).
 * @returns {Promise<boolean>} `true` se executado, senão `false`.
 */
window.FMARK.promoteParticipant = async function (groupId, contactsId) {
    try {
        if (!groupId || !contactsId || !window.Store?.WidFactory) return false;

        const ids = fmarkNormalizeParticipantIds(contactsId);
        if (!ids.length) return false;

        const groupChat = await fmarkGetGroupChat(groupId);
        if (!groupChat) return false;
        if (!fmarkHasGroupPermission(groupChat, false)) return false;

        const wids = ids.map((id) => Store.WidFactory.createWid(id));

        let participants = fmarkGetParticipantModels(groupChat, wids);
        if (!participants.length) return false;

        const canPromote_ = groupChat.groupMetadata?.participants;
        if (typeof canPromote_.canPromote === 'function') {
            participants = participants.filter((p) => canPromote_.canPromote(p));
        }
        if (!participants.length) return false;

        if (Store.OptionsParticipants?.promoteParticipants) {
            const result = await Store.OptionsParticipants.promoteParticipants(groupChat, participants);
            return result !== false;
        }

        return false;

    } catch (e) {
        console.error('Erro ao promover participante:', e);
        return false;
    }
};

/**
 * Remove permissões de admin (rebaixa) participante(s) em um grupo.
 *
 * @example
 * ```js
 * await FMARK.demoteParticipant('1203630...@g.us', '5511999999999@c.us');
 * ```
 *
 * @param {string|object} groupId ID do grupo (`...@g.us`).
 * @param {string|Array<string>} contactsId Participante(s).
 * @returns {Promise<boolean>} `true` se executado, senão `false`.
 */
window.FMARK.demoteParticipant = async function (groupId, contactsId) {
    try {
        if (!groupId || !contactsId || !window.Store?.WidFactory) return false;

        const ids = fmarkNormalizeParticipantIds(contactsId);
        if (!ids.length) return false;

        const groupChat = await fmarkGetGroupChat(groupId);
        if (!groupChat) return false;
        if (!fmarkHasGroupPermission(groupChat, false)) return false;

        const wids = ids.map((id) => Store.WidFactory.createWid(id));

        let participants = fmarkGetParticipantModels(groupChat, wids);
        if (!participants.length) return false;

        const canDemote_ = groupChat.groupMetadata?.participants;
        if (typeof canDemote_.canDemote === 'function') {
            participants = participants.filter((p) => canDemote_.canDemote(p));
        }
        if (!participants.length) return false;

        if (Store.OptionsParticipants?.demoteParticipants) {
            const result = await Store.OptionsParticipants.demoteParticipants(groupChat, participants);
            return result !== false;
        }

        return false;

    } catch (error) {
        console.error('Erro ao rebaixar participantes:', error);
        return false;
    }
};

//Nova funcao alternativa para enviar mensagens(Nao envia para grupos)
//Criada em 27/11/2019 Mike
window.FMARK.sendMessageToID2 = function (id, msgText) {
  window.Store.WapQuery.queryExist(id).then(function (e) {
    if (e.status === 200) {
      window.Store.FindChat.findOrCreateLatestChat(e.jid).then((create_chat) => {
        try {
          const chat = create_chat?.chat;
          window.Store.SendTextMsgToChat(chat, msgText);
          return true;
        } catch (e) {
          return false;
        }
      });
      return true;
    } else {
      return false;
    }
  });

  return false;
};

//Validar numero whatsapp 12/02/2020
window.FMARK.isValidNumber = async function (phoneId) {
  isValid = window.Store.WapQuery.queryExist(phoneId)
    .then((result) => {
      return result.jid !== undefined;
    })
    .catch((e) => {
      return false;
    });

  return isValid;
};

/** 28/04/2020 - Mike
 * Send location
 *
 * @param {string} chatId '558199999999@c.us'
 * @param {string} lat latitude
 * @param {string} lng longitude
 * @param {string} loc Texto link para a localizacao
 */

window.FMARK.sendLocation = async function (chatId, lat, lng, loc) {
  const resolvedId = await window.FMARK.getLidFromPhoneID(chatId);
  var idUser = new window.Store.UserConstructor(resolvedId || chatId, {
    intentionallyUsePrivateConstructor: true,
  });

  const fromwWid = await window.Store.Conn.wid;
  const create_chat = await Store.FindChat.findOrCreateLatestChat(idUser);

  const inChat = create_chat?.chat;

  let queue = Store.Contact.get(chatId);

  const newchat = Object.assign(queue, inChat);

  console.log(queue);

  console.log(newchat);
  // chat.lastReceivedKey._serialized = inChat._serialized;
  // chat.lastReceivedKey.id = inChat.id;

  // var tempMsg = Object.create(Store.Msg.models.filter(msg => msg.__x_isSentByMe && !msg.quotedMsg)[0]);
  var newId = window.FMARK.getNewMessageId(chatId);
  var message = fmarkBuildMessageBase({
    id: newId,
    from: fromwWid,
    to: chatId,
    local: true,
    self: "in",
    type: "location",
  });
  message.lat = lat;
  message.lng = lng;
  message.loc = loc;
  // Object.assign(tempMsg, extend);
  return await Promise.all(Store.addAndSendMsgToChat(newchat, message));
};

// Novas Funcoes incluidas por Marcelo Santos

window.FMARK.quickClean = function (ob) {
  return JSON.parse(JSON.stringify(ob));
};

window.FMARK.setMyName = async function (newName) {
  return await window.Store.Perfil.setPushname(newName);
};

window.FMARK.clearChat = async function (id) {
  return await Store.ChatUtil.sendClear(Store.Chat.get(id), true);
};

window.FMARK.setMyStatus = function (newStatus) {
  return Store.MyStatus.setMyStatus(newStatus);
};

window.FMARK.revokeGroupInviteLink = async function (chatId) {
  var chat = Store.Chat.get(chatId);
  if (!chat.id.isGroup()) return false;
  await Store.GroupInvite.revokeGroupInvite(chat);
  return true;
};

function SetConsoleMessageString(jsName, StringValue) {
  Obj = {
    name: jsName,
    result: StringValue,
  };
  console.log(JSON.stringify(Obj));
}

window.FMARK.getGroupInviteLink = async function (chatId) {
  try {
    let group = Store.GroupMetadata.get(chatId);
    if (!group || !group.id || !group.id.isGroup || !group.id.isGroup()) {
      SetConsoleMessageString("GetGroupInviteLink", "");
      return false;
    }
    if (Store.GroupInviteAction && Store.GroupInviteAction.queryGroupInviteCode) {
      await Store.GroupInviteAction.queryGroupInviteCode(group);
    } else if (Store.GroupInvite && Store.GroupInvite.sendQueryGroupInviteCode) {
      await Store.GroupInvite.sendQueryGroupInviteCode(group);
    }
    let code = group && group.inviteCode ? group.inviteCode : "";
    const link = code ? `https://chat.whatsapp.com/${code}` : "";
    SetConsoleMessageString("GetGroupInviteLink", link);
    return link;
  } catch (error) {
    console.error("Error in getGroupInviteLink:", error);
    SetConsoleMessageString("GetGroupInviteLink", "");
    return false;
  }
};

window.FMARK.getInviteCodeCustom = async function (GroupId, _result) {
  try {
    //const result = await WPP.group.getInviteCode(GroupId);
    var group = Store.GroupMetadata.get(GroupId);
    await Store.GroupInviteAction.queryGroupInviteCode(group);
    const result = group.inviteCode;
    _result.push(result);
  } catch (err) {
    _result.push("failed");
  }
  return _result;
};

/**
 * Returns an object with all of your host device details
 */
window.FMARK.getMe = function () {
  vMe = {
    ...FMARK.quickClean({
      ...Store.Contact.get(Store.Me.wid).attributes,
      ...Store.Me.attributes,
    }),
    me: Store.Me.me,
  };

  SetConsoleMessage("GetMe", JSON.stringify(vMe));
  return vMe;
};

window.FMARK.getStatus = async (id) => {
  var idUser = new Store.WidFactory.createWid(id, {
    intentionallyUsePrivateConstructor: true,
  });
  SetConsoleMessage("GetStatusMessage", JSON.stringify(await Store.MyStatus.getStatus(idUser)));
  //return status;
};

window.FMARK.checkNumberStatus = async function (id) {
  try {
    const result = await window.FMARK.checkListNumbers([id]);
    if (result.list[0]?.lid === undefined) {
      return false;
    } else {
      return true;
    }
  } catch (e) {
    return false;
  }
};

window.FMARK.generateMessageID = async function (chat, fromWidOverride) {
  const from = fromWidOverride != null ? fromWidOverride : Store.UserPrefs.getMaybeMePnUser();
  let to;
  var idUser = new Store.WidFactory.createWid(chat, {
    intentionallyUsePrivateConstructor: true,
  });
  to = idUser;

  let participant = undefined;

  if (to.isGroup() && Store.WidFactory.asChatWid) {
    participant = Store.WidFactory.asChatWid(from);
  }

  return new Store.MsgKey({
    from,
    to,
    id: await Promise.resolve(Store.getMsgKeyNewId()),
    participant,
    selfDir: "out",
  });
};

/*
// Send POOL
window.FMARK.sendMessageMD("[number]@c.us", "Name pool",
{
    pool:
    {
        list: ['Opção 1', 'Opção 2', 'Opção 3'],
        selectableCount: 2 // Quantidade de items que o usuario pode selecionar ( 0 = igual a Todos )
    }
});

// Send List - Use sendListMessage for best compatibility
await window.FMARK.sendListMessage("[number]@c.us", {
    buttonText: 'Click Me!', // REQUIRED
    description: "Hello it's list message", // REQUIRED
    title: 'Hello user', // optional
    footer: 'Click and choose one', // optional
    sections: [{
        title: 'Section 1',
        rows: [{
            rowId: 'rowid1',
            title: 'Row 1',
            description: "Hello it's description 1",
        },{
            rowId: 'rowid2',
            title: 'Row 2',
            description: "Hello it's description 2",
        }]
    }]
});

// Send Link Preview
window.FMARK.sendMessageMD("[number]@c.us", "Exemplo: https://www.youtube.com/watch?v=v1PBptSDIh8",
{
    linkPreview: {
        doNotPlayInline: false,
        isLoading:true,
        richPreviewType: 1
    }
});
*/

/**
 * Envia mensagem avançada (MD): texto, botões, lista, enquete e link preview.
 *
 * @example
 * ```js
 * await FMARK.sendMessageMD('5511...@c.us', 'Olá!');
 * await FMARK.sendMessageMD('5511...@c.us', 'Escolha:', {
 *   title: 'Menu',
 *   footer: 'Selecione',
 *   buttons: [{ id: '1', text: 'OK' }],
 * });
 * // Enviar para chat buscando pelo nome (formattedTitle):
 * await FMARK.sendMessageMD('', 'Olá!', { searchChatName: 'Meta AI' });
 * ```
 *
 * @param {string} chatId ChatId destino (ignorado se options.searchChatName for usado).
 * @param {string} messageText Texto da mensagem.
 * @param {object} [options] Opções (buttons/list/pool/linkPreview/searchChatName/etc).
 * @param {string} [options.searchChatName] Se definido, busca o chat pelo nome (formattedTitle). Ex: searchChatName: "Meta AI".
 * @returns {Promise<false|true|object>} Retorno compatível.
 */
window.FMARK.sendMessageMD = async function (chatId, messageText, options = {}) {
  // 1) Resolve o chat: por searchChatName (nome) ou por chatId (findOrCreate)
  let resolvedId, userWid, targetChat;
  const origin = "username_contactless_search";
  if (options.searchChatName != null && options.searchChatName !== "") {
    const searchName = String(options.searchChatName).trim();
    delete options.searchChatName;
    const models = Store.Chat && typeof Store.Chat.getModelsArray === "function" ? Store.Chat.getModelsArray() : [];
    const found = models.filter((e) => e.formattedTitle === searchName);
    const chatFromSearch = found.length ? found[0] : null;
    if (!chatFromSearch) {
      return false;
    }
    targetChat = chatFromSearch;
    resolvedId = targetChat.id && targetChat.id._serialized ? targetChat.id._serialized : String(targetChat.id || "");
    userWid = targetChat.id && targetChat.id._serialized ? targetChat.id : Store.WidFactory.createWid(resolvedId);
  } else {
    const getLid = await window.FMARK.getLidFromPhoneID(chatId);
    resolvedId = getLid || (typeof chatId === "string" ? chatId : chatId?._serialized);
    if (!resolvedId) {
      return false;
    }
    userWid = Store.WidFactory.createWid(resolvedId);
    const findOpts = { forceUsync: true };
    const { chat } = await Store.FindChat.findOrCreateLatestChat(userWid, origin, findOpts);
    targetChat = chat;
    if (!targetChat) {
      return false;
    }
  }

  // 2) Construir o payload básico (from: LID ou PN conforme o chat — wa-source WAWebPollsSendPollCreationMsgAction)
  let fromWid = await Store.UserPrefs.getMaybeMePnUser();
  if (Store.LidMigrationUtils && typeof Store.LidMigrationUtils.getMeUserLidOrJidForChat === "function") {
    try {
      const lidOrJid = Store.LidMigrationUtils.getMeUserLidOrJidForChat(targetChat);
      if (lidOrJid) fromWid = lidOrJid;
    } catch (_) {}
  }
  const msgId = await window.FMARK.generateMessageID(targetChat.id._serialized, fromWid);
  const now = Math.floor(Date.now() / 1000);
  const eph =
    Store.EphemeralFields && Store.EphemeralFields.getEphemeralFields
      ? Store.EphemeralFields.getEphemeralFields(targetChat)
      : {};

  // 3) Escolher tipo de mensagem
  let content = {
    type: "chat",
    body: messageText,
  };

  // 3a) Botões
  if (options.buttons) {
    fmarkEnsureButtonsTransportPatch(); // Ensure patches are applied
    content = prepareMessageButtons(content, options);
    delete options.buttons;
  }
  // 3b) List message
  else if (options.list) {
    fmarkEnsureButtonsTransportPatch(); // Ensure patches are applied for list messages
    const { sections, title, buttonText, description = " ", footer } = options.list;
    // WPP uses listType: 1 internally - patch forces product_list in XML
    content = {
      type: "list",
      body: description || " ", // Required for message preview
      list: { 
        title: title || "", 
        description: description || " ", 
        buttonText: buttonText || "", 
        footerText: footer || "",
        listType: 1, // SINGLE_SELECT - patch will force product_list in XML
        sections: sections || [] 
      },
      footer: footer || "",
    };
    delete options.list;
  }
  // 3c) Enquete (poll) — implementação completa em sendMessageMD (PollsSendPollCreationMsgAction + fallback manual)
  else if (options.pool) {
    const { list: pollList, selectableCount = 0 } = options.pool;
    const trim = (s) => (typeof s === "string" ? s.trim() : s);
    const pollName = trim(messageText) || "";
    delete options.pool;
    const isGroup = resolvedId.endsWith("@g.us");
    const findOptsPool = isGroup ? {} : { forceUsync: true };
    const { chat: poolChat } = await Store.FindChat.findOrCreateLatestChat(userWid, origin, findOptsPool);
    if (!poolChat) {
      return false;
    }
    const prepareActionPool = window.Store?.PrepareMessageSendingAction?.prepareChatForMessageSending;
    const hasPreparePool = typeof prepareActionPool === "function";
    if (hasPreparePool && poolChat && typeof poolChat === "object") {
      try {
        poolChat.__x_chatEntryPoint = "Chatlist";
      } catch (_) {}
    }
    if (hasPreparePool) {
      try {
        await prepareActionPool(poolChat);
      } catch (_) {}
    }
    const optionsForAction = (Array.isArray(pollList) ? pollList : []).map((opt) => ({
      name: trim(typeof opt === "string" ? opt : opt?.name || ""),
    }));
    const name = trim(pollName) || "";
    const PollsAction = window.Store?.PollsSendPollCreationMsgAction;
    if (PollsAction && typeof PollsAction.sendPollCreation === "function" && Store.PollCreationUtils) {
      try {
        const poll = {
          name,
          options: optionsForAction,
          selectableOptionsCount: Math.max(0, selectableCount | 0),
          contentType: Store.PollCreationUtils.PollContentType.TEXT,
          pollType: Store.PollCreationUtils.PollType.POLL,
        };
        const results = await PollsAction.sendPollCreation({ poll, chat: poolChat });
        if (Array.isArray(results) && results[1]?.messageSendResult) {
          const status = String(results[1].messageSendResult).toLowerCase();
          if (status === "success" || status === "ok") {
            return results[0] || true;
          }
        }
        return false;
      } catch (err) {
        console.warn("[FMARK] sendMessageMD pool via PollsSendPollCreationMsgAction failed, using fallback:", err);
      }
    }
    let fromWidPool = await Store.UserPrefs.getMaybeMePnUser();
    if (Store.LidMigrationUtils && typeof Store.LidMigrationUtils.getMeUserLidOrJidForChat === "function") {
      try {
        const lidOrJid = Store.LidMigrationUtils.getMeUserLidOrJidForChat(poolChat);
        if (lidOrJid) fromWidPool = lidOrJid;
      } catch (_) {}
    }
    const msgIdPool = await window.FMARK.generateMessageID(poolChat.id._serialized, fromWidPool);
    const nowPool = Math.floor(Date.now() / 1000);
    const ephPool =
      Store.EphemeralFields && Store.EphemeralFields.getEphemeralFields
        ? Store.EphemeralFields.getEphemeralFields(poolChat)
        : {};
    const optionsArr = optionsForAction.map((opt, idx) => ({ name: opt.name, localId: idx }));
    const contentPool = {
      type: "poll_creation",
      kind: "pollCreation",
      viewMode: (Store.ViewMode && Store.ViewMode.ViewModeType && Store.ViewMode.ViewModeType.VISIBLE) || "VISIBLE",
      isWamoSub: false,
      pollName: name,
      pollOptions: optionsArr,
      pollSelectableOptionsCount: Math.max(0, selectableCount | 0),
      messageSecret: crypto.getRandomValues(new Uint8Array(32)),
    };
    if (Store.PollCreationUtils) {
      if (Store.PollCreationUtils.PollContentType) contentPool.pollContentType = Store.PollCreationUtils.PollContentType.TEXT;
      if (Store.PollCreationUtils.PollType) contentPool.pollType = Store.PollCreationUtils.PollType.POLL;
    }
    const messagePool = {
      id: msgIdPool,
      ack: 0,
      from: fromWidPool,
      to: userWid,
      local: true,
      t: nowPool,
      isNewMsg: true,
      ...contentPool,
      ...ephPool,
    };
    const resultsPool = await Promise.all(window.Store.addAndSendMsgToChat(poolChat, messagePool));
    if (Array.isArray(resultsPool) && resultsPool[1]?.messageSendResult) {
      const statusPool = String(resultsPool[1].messageSendResult).toLowerCase();
      if (statusPool === "success" || statusPool === "ok") {
        return resultsPool[0] || true;
      }
    }
    return false;
  }

  // 3d) Menções
  if (options.detectMentioned) {
    let mentioned = [];
      const toMentionWid = (id) => {
        try {
          if (!id) return null;
          if (typeof id === "string") {
            const s = id.trim();
            if (!s) return null;
            if (s.includes("@")) return Store.WidFactory.createWid(s);
            if (Store.WidFactory.createUserWid) return Store.WidFactory.createUserWid(s);
            return Store.WidFactory.createWid(`${s}@c.us`);
          }
          if (id._serialized) return Store.WidFactory.createWid(id._serialized);
          if (id.toString && typeof id.toString === "function") {
            const s = id.toString();
            if (s && typeof s === "string" && s.includes("@")) return Store.WidFactory.createWid(s);
          }
        } catch {}
        return null;
      };

      if (Array.isArray(options.listMention)) {
        mentioned = options.listMention.map((id) => toMentionWid(id)).filter(Boolean);
      } else {
        const ids = messageText.match(/(?<=@)(\d+)\b/g) || [];
        mentioned = ids.map((id) => Store.WidFactory.createWid(`${id}@c.us`));
        if (options.oculteMembers) {
          messageText = messageText.replace(/@\d+\b/g, "");
          content.body = messageText;
      }
    }
    content.type = "chat";
    content.body = messageText;
    content.mentionedJidList = mentioned;
    delete options.detectMentioned;
    delete options.listMention;
    delete options.oculteMembers;
  }

  // 3e) Mensagem de bot
  if (targetChat.id.isBot && targetChat.id.isBot()) {
    content = {
      ...content,
      messageSecret: await Store.genBotMsgSecretFromMsgSecret(crypto.getRandomValues(new Uint8Array(32))),
      botPersonaId: Store.BotProfileCollection.get(targetChat.id.toString())?.personaId,
    };
  }

  // 4) Monta o objeto de mensagem (poll_creation: conforme oficial — ack:0, sem self/subtype/urlText/urlNumber/pmCampaignId)
  let message;
  if (content.type === "poll_creation") {
    message = {
      id: msgId,
      ack: 0,
      from: fromWid,
      to: userWid,
      local: true,
      t: now,
      isNewMsg: true,
      ...content,
      ...eph,
    };
  } else {
    message = {
      id: msgId,
      ack: 1,
      from: fromWid,
      to: userWid,
      local: true,
      self: "out",
      t: now,
      isNewMsg: true,
      subtype: null,
      urlText: null,
      urlNumber: null,
      pmCampaignId: generateRandomNumericId(),
      ...content,
      ...eph,
    };
  }

  // 5) Link preview, se houver (não aplica a poll_creation)
  if (content.type !== "poll_creation") {
    message = await prepareLinkPreview(message, options);
  }

  // 5.5) Igual ao clique oficial no botão enquete: marcar entry point antes do prepare, depois prepare (E2EE/prefetch)
  const prepareAction = window.Store?.PrepareMessageSendingAction?.prepareChatForMessageSending;
  const hasPrepareMessage = typeof prepareAction === "function";
  if (hasPrepareMessage && targetChat && typeof targetChat === "object") {
    try {
      targetChat.__x_chatEntryPoint = "Chatlist";
    } catch (_) {}
  }
  if (hasPrepareMessage) {
    try {
      await prepareAction(targetChat);
    } catch (_) {}
  }

  // 6) Envia e aguarda
  const results = await Promise.all(window.Store.addAndSendMsgToChat(targetChat, message));

  console.log(results);

  // 7) Retorna true/message ou false
  if (Array.isArray(results) && results[1]?.messageSendResult) {
    const status = results[1].messageSendResult.toLowerCase();
    if (status === "success" || status === "ok") {
      return results[0] || true;
    }
  }
  return false;
};

function generateRandomNumericId(digitCount = 16) {
  // Garante que temos pelo menos 1 dígito
  digitCount = Math.max(1, digitCount);

  let id = "";

  // Primeiro dígito não pode ser zero para manter um número válido de 16 dígitos
  id += Math.floor(Math.random() * 9) + 1; // Dígito entre 1-9

  // Gera os dígitos restantes
  for (let i = 1; i < digitCount; i++) {
    id += Math.floor(Math.random() * 10); // Dígito entre 0-9
  }

  return id;
}

async function prepareLinkPreview(message, options) {
  if (!options.linkPreview) {
    return message;
  }

  if (options.linkPreview) {
    const override = typeof options.linkPreview === "object" ? options.linkPreview : {};

    const text = message.type === "chat" ? message.body : "";

    if (text) {
      try {
        const link = Store.findFirstWebLink(text);
        if (link) {
          //const preview = await Store.registerLinkOption.fetchPlaintextLinkPreviewAction(link);
          const preview = await Store.GetPreviewLinkAction.getLinkPreview(link);
          if (preview && preview.data) {
            options.linkPreview = { ...preview.data, ...override };
          }
        }
      } catch (error) {}
    }
  }

  if (typeof options.linkPreview === "object") {
    message.subtype = "url";
    message = {
      ...message,
      ...options.linkPreview,
    };
  }

  return message;
}

async function prepareAudioWaveform(options, file) {
  if (!options.isPtt || !options.waveform) {
    return;
  }

  try {
    const audioData = await file.arrayBuffer();
    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(audioData);

    const rawData = audioBuffer.getChannelData(0); // We only need to work with one channel of data
    const samples = 64; // Number of samples we want to have in our final data set
    const blockSize = Math.floor(rawData.length / samples); // the number of samples in each subdivision
    const filteredData = [];
    for (let i = 0; i < samples; i++) {
      const blockStart = blockSize * i; // the location of the first sample in the block
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum = sum + Math.abs(rawData[blockStart + j]); // find the sum of all the samples in the block
      }
      filteredData.push(sum / blockSize); // divide the sum by the block size to get the average
    }

    // This guarantees that the largest data point will be set to 1, and the rest of the data will scale proportionally.
    const multiplier = Math.pow(Math.max(...filteredData), -1);
    const normalizedData = filteredData.map((n) => n * multiplier);

    // Generate waveform like WhatsApp
    const waveform = new Uint8Array(normalizedData.map((n) => Math.floor(100 * n)));

    return {
      duration: Math.floor(audioBuffer.duration),
      waveform,
    };
  } catch (error) {
    console.error("Failed to generate waveform", error);
  }
}

function fmarkButtonsSafeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function fmarkButtonsGetInteractiveMessage(proto) {
  return proto?.viewOnceMessage?.message?.interactiveMessage || proto?.viewOnceMessage?.interactiveMessage || null;
}

function fmarkButtonsSplitDevices(proto, devices) {
  const mobileDevices = Array.isArray(devices) ? devices.filter((p) => !p?.device) : [];
  const webDevices = Array.isArray(devices) ? devices.filter((p) => !!p?.device) : [];
  const interactiveMessage = fmarkButtonsGetInteractiveMessage(proto);

  let protoForWeb = null;
  if (interactiveMessage) {
    protoForWeb = JSON.parse(JSON.stringify(proto));

    const headerObj = interactiveMessage.header || {};
    const mediaPart = ["documentMessage", "documentWithCaptionMessage", "imageMessage", "videoMessage"];
    let header = undefined;
    let headerType = 1;

    for (const partName of mediaPart) {
      if (Object.prototype.hasOwnProperty.call(headerObj, partName)) {
        header = { [partName]: headerObj[partName] };
        headerType =
          partName === "imageMessage" ? 4 : partName.includes("document") ? 3 : partName === "videoMessage" ? 5 : 1;
        break;
      }
    }

    const buttons = interactiveMessage?.nativeFlowMessage?.buttons || [];
    let useTemplateMessage = false;

    const buttonsMessage = {
      message: {
        buttonsMessage: {
          headerType,
          contentText: interactiveMessage?.body?.text || " ",
          footerText: interactiveMessage?.footer?.text || " ",
          ...header,
          buttons: buttons
            .map((button, index) => {
              if (button?.name === "quick_reply") {
                const params = fmarkButtonsSafeJsonParse(button.buttonParamsJson) || {};
                return {
                  type: 1,
                  buttonId: params.id || `${index}`,
                  buttonText: { displayText: params.display_text || " " },
                };
              }
              useTemplateMessage = true;
              return null;
            })
            .filter((i) => i != null),
        },
      },
    };

    const templateMessage = {
      message: {
        templateMessage: {
          hydratedTemplate: {
            hydratedButtons: buttons
              .map((button, index) => {
                const params = fmarkButtonsSafeJsonParse(button.buttonParamsJson) || {};

                if (button?.name === "quick_reply") {
                  return {
                    index: index,
                    quickReplyButton: {
                      displayText: params.display_text || " ",
                      id: params.id || `${index}`,
                    },
                  };
                }
                if (button?.name === "cta_url") {
                  return {
                    index: index,
                    urlButton: {
                      displayText: params.display_text || " ",
                      url: params.url,
                    },
                  };
                }
                if (button?.name === "cta_copy") {
                  return {
                    index: index,
                    urlButton: {
                      displayText: params.display_text || " ",
                      url: `https://www.whatsapp.com/otp/code/?otp_type=COPY_CODE&code=otp${params.copy_code}`,
                    },
                  };
                }
                if (button?.name === "cta_call") {
                  return {
                    index: index,
                    callButton: {
                      displayText: params.display_text || " ",
                      phoneNumber: params.phone_number,
                    },
                  };
                }
                return null;
              })
              .filter((i) => i != null),
            ...header,
            ...(headerType === 1 ? { hydratedTitleText: interactiveMessage?.header?.title || " " } : undefined),
            hydratedContentText: interactiveMessage?.body?.text || " ",
            hydratedFooterText: interactiveMessage?.footer?.text || " ",
          },
        },
      },
    };

    delete protoForWeb.viewOnceMessage;
    protoForWeb.documentWithCaptionMessage = useTemplateMessage ? templateMessage : buttonsMessage;
    protoForWeb.messageContextInfo = proto.messageContextInfo;
  }

  return [
    { proto, devices: mobileDevices },
    { proto: protoForWeb || proto, devices: webDevices },
  ];
}

async function fmarkButtonsEncryptAndParserFanout(originalFn, thisArg, args, protoIndex, devicesIndex) {
  const proto = args[protoIndex];
  const devices = args[devicesIndex];
  if (!proto || !Array.isArray(devices) || devices.length === 0) {
    return await originalFn.apply(thisArg, args);
  }

  const parts = [];
  const splits = fmarkButtonsSplitDevices(proto, devices);

  await Promise.all(
    splits.map(async (split) => {
      if (!split?.devices?.length) return;

      const splitArgs = args.slice();
      splitArgs[protoIndex] = split.proto;
      splitArgs[devicesIndex] = split.devices;

      const result = await originalFn.apply(thisArg, splitArgs);
      const stanza = result?.stanza || result;
      const content = stanza?.content?.[0]?.content;
      if (Array.isArray(content)) {
        parts.push(...content);
      }
    })
  );

  const node = await originalFn.apply(thisArg, args);
  if (parts.length > 0) {
    const stanza = node?.stanza || node;
    if (stanza?.content?.[0] && Array.isArray(stanza.content[0].content)) {
      stanza.content[0].content = parts;
    }
  }
  return node;
}

function fmarkEnsureButtonsTransportPatch() {
  try {
    window._FMARK = window._FMARK || {};
    if (window._FMARK._buttonsTransportPatched) return true;

    const patcher = window.FMARK && window.FMARK.patchModuleByFunctions;
    if (typeof patcher !== "function") return false;

    let okCreateMsgProtobuf = false;
    let okCreateFanout = false;

    const resCreateMsg = patcher(["createMsgProtobuf"], null, (mod) => {
      if (typeof mod.createMsgProtobuf !== "function" || mod.createMsgProtobuf.__fmarkButtonsPatched) return;

      const original = mod.createMsgProtobuf;
      const wrapped = function (...args) {
        const message = args[0];
        const proto = original.apply(this, args);
        try {
          if (message?.interactiveMessage?.nativeFlowMessage?.buttons !== undefined && proto) {
            const mediaPart = [
              "documentMessage",
              "documentWithCaptionMessage",
              "imageMessage",
              "locationMessage",
              "videoMessage",
            ];

            for (let part of mediaPart) {
              if (part in proto) {
                const partName = part;
                if (part === "documentWithCaptionMessage") part = "documentMessage";

                message.interactiveMessage.header = {
                  ...(message.interactiveMessage.header || {}),
                  [`${part}`]: proto[partName]?.message?.documentMessage || proto[partName],
                  hasMediaAttachment: true,
                };

                delete proto[partName];
                break;
              }
            }

            if (typeof proto.extendedTextMessage !== "undefined") delete proto.extendedTextMessage;
            if (typeof proto.conversation !== "undefined") delete proto.conversation;

            proto.viewOnceMessage = {
              message: {
                interactiveMessage: message.interactiveMessage,
              },
            };
          }
        } catch {}
        return proto;
      };

      wrapped.__fmarkButtonsPatched = true;
      wrapped.__fmarkButtonsOriginal = original;
      mod.createMsgProtobuf = wrapped;
    });
    okCreateMsgProtobuf = !!resCreateMsg;

    const resFanout = patcher(["createFanoutMsgStanza"], null, (mod) => {
      if (typeof mod.createFanoutMsgStanza !== "function" || mod.createFanoutMsgStanza.__fmarkButtonsPatched) return;

      const original = mod.createFanoutMsgStanza;
      const wrapped = async function (...args) {
        const protoIndex = args[1]?.id ? 2 : 1;
        const devicesIndex = args[1]?.id ? 3 : 2;
        const proto = args[protoIndex];

        // Determine if we need to add biz node (for buttons or list messages)
        let buttonNode = null;
        const smax = window.Store?.websocket?.smax || window.Store?.smax;

        try {
          if (proto?.buttonsMessage && smax) {
            // For buttons message
            buttonNode = smax("buttons");
          } else if (proto?.listMessage && smax) {
            // The trick to send list message is to force the 'product_list' type in the biz node
            // This is the exact same logic WPP uses
            console.log("[FMARK] List message detected, applying product_list patch");
            const listType = 2; // Force product_list type
            const types = ["unknown", "single_select", "product_list"];
            buttonNode = smax("list", {
              v: "2",
              type: types[listType],
            });
          }
        } catch (e) {
          console.warn("[FMARK] Error determining button/list node:", e);
        }

        // Handle interactive messages (buttons with native flow)
        try {
          if (proto?.viewOnceMessage?.message?.interactiveMessage) {
            const node = await fmarkButtonsEncryptAndParserFanout(original, this, args, protoIndex, devicesIndex);
            // Also add biz node if needed for interactive messages
            if (buttonNode && node) {
              try {
                const content = node.content || node?.stanza?.content;
                if (Array.isArray(content)) {
                  let bizNode = content.find((c) => c.tag === "biz");
                  if (!bizNode && smax) {
                    bizNode = smax("biz", {}, null);
                    content.push(bizNode);
                  }
                  if (bizNode) {
                    if (!Array.isArray(bizNode.content)) {
                      bizNode.content = [];
                    }
                    const hasButtonNode = bizNode.content.some((c) => c.tag === buttonNode?.tag);
                    if (!hasButtonNode) {
                      bizNode.content.push(buttonNode);
                    }
                  }
                }
              } catch (e) {
                console.warn("[FMARK] Error adding biz node to interactive message:", e);
              }
            }
            return node;
          }
        } catch (e) {
          console.warn("[FMARK] Error handling interactive message:", e);
        }

        // Call original function
        let node = await original.apply(this, args);

        // Add biz node for buttons/list messages (this is the critical fix for list messages!)
        if (buttonNode && node && smax) {
          try {
            const content = node.content || node?.stanza?.content;
            if (Array.isArray(content)) {
              let bizNode = content.find((c) => c.tag === "biz");
              if (!bizNode) {
                bizNode = smax("biz", {}, null);
                content.push(bizNode);
              }
              if (bizNode) {
                if (!Array.isArray(bizNode.content)) {
                  bizNode.content = [];
                }
                const hasButtonNode = bizNode.content.some((c) => c.tag === buttonNode?.tag);
                if (!hasButtonNode) {
                  bizNode.content.push(buttonNode);
                }
              }
            }
          } catch (e) {
            console.warn("[FMARK] Error adding biz node for list/buttons:", e);
          }
        }

        return node;
      };

      wrapped.__fmarkButtonsPatched = true;
      wrapped.__fmarkButtonsOriginal = original;
      mod.createFanoutMsgStanza = wrapped;
    });
    okCreateFanout = !!resFanout;

    patcher(["encodeMaybeMediaType"], null, (mod) => {
      if (typeof mod.encodeMaybeMediaType !== "function" || mod.encodeMaybeMediaType.__fmarkButtonsPatched) return;

      const original = mod.encodeMaybeMediaType;
      const wrapped = function (...args) {
        const type = args[0];
        if (type === "button") {
          try {
            return original.call(this, null);
          } catch {
            return original.apply(this, [null]);
          }
        }
        return original.apply(this, args);
      };

      wrapped.__fmarkButtonsPatched = true;
      wrapped.__fmarkButtonsOriginal = original;
      mod.encodeMaybeMediaType = wrapped;
    });

    patcher(["mediaTypeFromProtobuf"], null, (mod) => {
      if (typeof mod.mediaTypeFromProtobuf !== "function" || mod.mediaTypeFromProtobuf.__fmarkButtonsPatched) return;

      const original = mod.mediaTypeFromProtobuf;
      const wrapped = function (proto) {
        try {
          if (proto?.deviceSentMessage) {
            const n = proto.deviceSentMessage.message;
            return n ? wrapped(n) : null;
          }
          if (proto?.ephemeralMessage) {
            const n = proto.ephemeralMessage.message;
            return n ? wrapped(n) : null;
          }
          if (proto?.viewOnceMessage) {
            const n = proto.viewOnceMessage.message;
            return n ? wrapped(n) : null;
          }

          if (proto?.documentWithCaptionMessage?.message?.templateMessage?.hydratedTemplate) {
            return original.call(this, proto.documentWithCaptionMessage.message.templateMessage.hydratedTemplate);
          }
        } catch {}
        return original.apply(this, arguments);
      };

      wrapped.__fmarkButtonsPatched = true;
      wrapped.__fmarkButtonsOriginal = original;
      mod.mediaTypeFromProtobuf = wrapped;
    });

    patcher(["typeAttributeFromProtobuf"], null, (mod) => {
      if (typeof mod.typeAttributeFromProtobuf !== "function" || mod.typeAttributeFromProtobuf.__fmarkButtonsPatched)
        return;

      const original = mod.typeAttributeFromProtobuf;
      const wrapped = function (proto) {
        try {
          if (proto?.ephemeralMessage) {
            const n = proto.ephemeralMessage.message;
            return n ? wrapped(n) : "text";
          }
          if (proto?.deviceSentMessage) {
            const n = proto.deviceSentMessage.message;
            return n ? wrapped(n) : "text";
          }
          if (proto?.viewOnceMessage) {
            const n = proto.viewOnceMessage.message;
            if (n?.interactiveMessage) {
              const header = n.interactiveMessage?.header || {};
              const messagePart = [
                "documentMessage",
                "documentWithCaptionMessage",
                "imageMessage",
                "locationMessage",
                "videoMessage",
              ];
              if (messagePart.some((part) => Object.prototype.hasOwnProperty.call(header, part))) {
                return "media";
              }
              return "text";
            }
            return n ? wrapped(n) : "text";
          }

          if (proto?.interactiveMessage) {
            const header = proto.interactiveMessage?.header || {};
            const messagePart = [
              "documentMessage",
              "documentWithCaptionMessage",
              "imageMessage",
              "locationMessage",
              "videoMessage",
            ];
            if (messagePart.some((part) => Object.prototype.hasOwnProperty.call(header, part))) {
              return "media";
            }
            return "text";
          }

          if (proto?.documentWithCaptionMessage?.message?.templateMessage?.hydratedTemplate) {
            const keys = Object.keys(proto.documentWithCaptionMessage.message.templateMessage.hydratedTemplate || {});
            const messagePart = ["documentMessage", "imageMessage", "locationMessage", "videoMessage"];
            if (messagePart.some((part) => keys.includes(part))) {
              return "media";
            }
            return "text";
          }

          if (proto?.buttonsMessage?.headerType === 1 || proto?.buttonsMessage?.headerType === 2) {
            return "text";
          }

          // Critical for list messages to work - WPP also does this
          if (proto?.listMessage) {
            return "text";
          }
        } catch {}
        return original.apply(this, arguments);
      };

      wrapped.__fmarkButtonsPatched = true;
      wrapped.__fmarkButtonsOriginal = original;
      mod.typeAttributeFromProtobuf = wrapped;
    });

    patcher(["getABPropConfigValue"], "WAWebABProps", (mod) => {
      if (typeof mod.getABPropConfigValue !== "function" || mod.getABPropConfigValue.__fmarkButtonsPatched) return;

      const original = mod.getABPropConfigValue;
      const wrapped = function (...args) {
        const key = args[0];
        if (key === "web_unwrap_message_for_stanza_attributes") {
          return false;
        }
        if (key === "enable_web_calling") {
          return true;
        }
        return original.apply(this, args);
      };

      wrapped.__fmarkButtonsPatched = true;
      wrapped.__fmarkButtonsOriginal = original;
      mod.getABPropConfigValue = wrapped;
    });

    if (okCreateMsgProtobuf && okCreateFanout) {
      window._FMARK._buttonsTransportPatched = true;
      console.log("[FMARK] Buttons/List transport patches applied successfully!");
      return true;
    }
  } catch (e) {
    console.warn("[FMARK] Failed to apply buttons patch:", e);
  }
  return false;
}

/**
 * Extract video information (duration, width, height) from buffer
 * Used when browser cannot decode video for thumbnail generation
 * @param {ArrayBuffer} arrayBuffer - Video file as ArrayBuffer
 * @returns {{ duration: number, width: number, height: number }}
 */
function fmarkGetVideoInfoFromBuffer(arrayBuffer) {
  const buffer = new Uint8Array(arrayBuffer);
  
  // Find mvhd header
  const mvhdStr = "mvhd";
  let mvhdIndex = -1;
  for (let i = 0; i < buffer.length - 4; i++) {
    if (buffer[i] === 109 && buffer[i+1] === 118 && buffer[i+2] === 104 && buffer[i+3] === 100) {
      mvhdIndex = i;
      break;
    }
  }
  
  if (mvhdIndex === -1) {
    return { duration: 0, width: 640, height: 480 };
  }
  
  const start = mvhdIndex + 17;
  const view = new DataView(arrayBuffer);
  const timeScale = view.getUint32(start, false);
  const durationRaw = view.getUint32(start + 4, false);
  
  // Find avc1 for dimensions
  const avc1Str = "avc1";
  let avc1Index = -1;
  for (let i = 0; i < buffer.length - 4; i++) {
    if (buffer[i] === 97 && buffer[i+1] === 118 && buffer[i+2] === 99 && buffer[i+3] === 49) {
      avc1Index = i;
      break;
    }
  }
  
  let width = 640, height = 480;
  if (avc1Index !== -1) {
    try {
      width = view.getUint16(avc1Index + 4 + 24, false);
      height = view.getUint16(avc1Index + 4 + 26, false);
    } catch (e) {
      // Use defaults
    }
  }
  
  const duration = Math.floor((durationRaw / timeScale) * 1000) / 1000;
  
  return {
    duration: Math.floor(duration),
    width: width || 640,
    height: height || 480,
  };
}

/**
 * Generate a white thumbnail when browser cannot decode video
 * @param {number} width - Original video width
 * @param {number} height - Original video height
 * @param {number} maxSize - Maximum thumbnail size
 * @returns {{ url: string, width: number, height: number, fullWidth: number, fullHeight: number }}
 */
function fmarkGenerateWhiteThumb(width, height, maxSize) {
  let r = height || maxSize;
  let i = width || maxSize;

  if (r > i) {
    if (r > maxSize) {
      i *= maxSize / r;
      r = maxSize;
    }
  } else {
    if (i > maxSize) {
      r *= maxSize / i;
      i = maxSize;
    }
  }

  const bounds = { width: Math.max(Math.round(r), 1), height: Math.max(Math.round(i), 1) };

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = bounds.width;
  canvas.height = bounds.height;

  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  return {
    url: canvas.toDataURL("image/jpeg"),
    width: bounds.width,
    height: bounds.height,
    fullWidth: width,
    fullHeight: height,
  };
}

/**
 * Apply video patches for Chromium/headless browsers
 * Patches generateVideoThumbsAndDuration, processRawAudioVideo and uploadMedia
 */
function fmarkEnsureVideoPatch() {
  try {
    window._FMARK = window._FMARK || {};
    if (window._FMARK._videoPatchApplied) return true;

    // Use the same patcher as buttons patch
    const patcher = window.FMARK && window.FMARK.patchModuleByFunctions;
    if (typeof patcher !== "function") {
      console.warn("[FMARK] Cannot find patcher for video patches - FMARK.patchModuleByFunctions not available");
      return false;
    }

    let patchedVideoThumbs = false;
    let patchedUploadMedia = false;
    let patchedProcessRaw = false;

    // Patch generateVideoThumbsAndDuration for MEDIA_ERR_SRC_NOT_SUPPORTED error
    try {
      const resVideoThumbs = patcher(["generateVideoThumbsAndDuration"], null, (mod) => {
        if (typeof mod.generateVideoThumbsAndDuration !== "function" || mod.generateVideoThumbsAndDuration.__fmarkVideoPatched) return;

        const original = mod.generateVideoThumbsAndDuration;
        const wrapped = async function (...args) {
          const [data] = args;

          try {
            return await original.apply(this, args);
          } catch (error) {
            // Handle MEDIA_ERR_SRC_NOT_SUPPORTED error in Chromium/headless
            if (typeof error?.message === "string" && 
                (error.message.includes("MEDIA_ERR_SRC_NOT_SUPPORTED") || 
                 error.message.includes("MEDIA_ERR") ||
                 error.message.includes("video"))) {
              console.log("[FMARK] Video decode error, generating white thumbnail fallback");
              try {
                const arrayBuffer = await data.file.arrayBuffer();
                const info = fmarkGetVideoInfoFromBuffer(arrayBuffer);

                return {
                  duration: info.duration,
                  thumbs: data.maxDimensions.map((d) =>
                    fmarkGenerateWhiteThumb(info.width, info.height, d)
                  ),
                };
              } catch (fallbackError) {
                console.error("[FMARK] Fallback thumbnail generation failed:", fallbackError);
              }
            }

            throw error;
          }
        };
        wrapped.__fmarkVideoPatched = true;
        wrapped.__fmarkVideoOriginal = original;
        mod.generateVideoThumbsAndDuration = wrapped;
      });
      patchedVideoThumbs = !!resVideoThumbs;
    } catch (e) {
      console.warn("[FMARK] Failed to patch generateVideoThumbsAndDuration:", e);
    }

    // Patch sendMessageToMediaWorker to handle WebWorker failures in headless browsers
    try {
      const resMediaWorker = patcher(["sendMessageToMediaWorker"], null, (mod) => {
        if (typeof mod.sendMessageToMediaWorker !== "function" || mod.sendMessageToMediaWorker.__fmarkPatched) return;

        const original = mod.sendMessageToMediaWorker;
        const wrapped = async function (...args) {
          try {
            return await original.apply(this, args);
          } catch (error) {
            console.warn("[FMARK] sendMessageToMediaWorker failed, returning fallback result:", error?.message || error);
            
            const [message] = args;
            // Return a result that indicates the file should be used as-is
            if (message && message.type === "prep" && message.file) {
              return {
                type: "result",
                result: { type: message.file.type, file: message.file, isGif: message.asGif || false },
                error: null,
                filename: message.file.name || "video.mp4",
                file: message.file,
              };
            }
            throw error;
          }
        };
        wrapped.__fmarkPatched = true;
        wrapped.__fmarkOriginal = original;
        mod.sendMessageToMediaWorker = wrapped;
      });
      if (resMediaWorker) {
        console.log("[FMARK] sendMessageToMediaWorker patch applied");
      }
    } catch (e) {
      console.warn("[FMARK] Failed to patch sendMessageToMediaWorker:", e);
    }

    // Patch checkAndRepair to handle MediaWorker failures
    try {
      const resCheckRepair = patcher(["checkAndRepair"], null, (mod) => {
        if (typeof mod.checkAndRepair !== "function" || mod.checkAndRepair.__fmarkPatched) return;

        const original = mod.checkAndRepair;
        const wrapped = async function (...args) {
          try {
            const result = await original.apply(this, args);
            // If original succeeded, return it
            if (result && result[0]) {
              return result;
            }
            // If original returned undefined/null, try fallback
            throw new Error("checkAndRepair returned no result");
          } catch (error) {
            console.warn("[FMARK] checkAndRepair failed, using fallback:", error?.message || error);
            
            const [file, asGif] = args;
            
            // Return the original file as-is with a flag indicating it wasn't repaired
            // This bypasses the MediaWorker entirely
            try {
              // Create a result that looks like a successful check
              // [file, wasRepaired]
              return [{ type: file.type, file: file, isGif: asGif || false }, false];
            } catch (fallbackError) {
              console.error("[FMARK] checkAndRepair fallback failed:", fallbackError);
              // Return [undefined, false] to allow the hybrid transcoder path
              return [undefined, false];
            }
          }
        };
        wrapped.__fmarkPatched = true;
        wrapped.__fmarkOriginal = original;
        mod.checkAndRepair = wrapped;
      });
      patchedProcessRaw = !!resCheckRepair;
      if (patchedProcessRaw) {
        console.log("[FMARK] checkAndRepair patch applied");
      }
    } catch (e) {
      console.warn("[FMARK] Failed to patch checkAndRepair:", e);
    }

    // Patch processRawAudioVideo as additional fallback
    try {
      const resProcessRaw = patcher(["processRawAudioVideo"], null, (mod) => {
        if (typeof mod.processRawAudioVideo !== "function" || mod.processRawAudioVideo.__fmarkPatched) return;

        const original = mod.processRawAudioVideo;
        const wrapped = async function (...args) {
          try {
            return await original.apply(this, args);
          } catch (error) {
            // If video processing fails, try to return a basic result
            console.warn("[FMARK] processRawAudioVideo failed, attempting fallback:", error?.message || error);
            
            const [mediaBlob, isPtt, precomputedFields, asGif] = args;
            
            // Try to get basic info and return without transcoding
            if (mediaBlob && typeof mediaBlob.forceToBlob === "function") {
              try {
                const blob = mediaBlob.forceToBlob();
                const arrayBuffer = await blob.arrayBuffer();
                const info = fmarkGetVideoInfoFromBuffer(arrayBuffer);
                const thumb = fmarkGenerateWhiteThumb(info.width, info.height, 100);
                
                // Create an OpaqueData-like object if Store is available
                let mediaBlobResult = blob;
                if (window.Store?.OpaqueData?.createFromData) {
                  try {
                    mediaBlobResult = await window.Store.OpaqueData.createFromData(blob, "video/mp4");
                  } catch (e) {
                    mediaBlobResult = blob;
                  }
                }
                
                return {
                  type: "video/mp4",
                  mediaBlob: mediaBlobResult,
                  mimetype: "video/mp4",
                  isGif: asGif || false,
                  size: blob.size,
                  fullWidth: info.width,
                  fullHeight: info.height,
                  preview: thumb.url,
                  duration: String(info.duration),
                };
              } catch (fallbackError) {
                console.error("[FMARK] processRawAudioVideo fallback failed:", fallbackError);
              }
            }
            
            throw error;
          }
        };
        wrapped.__fmarkPatched = true;
        wrapped.__fmarkOriginal = original;
        mod.processRawAudioVideo = wrapped;
      });
      if (resProcessRaw) {
        console.log("[FMARK] processRawAudioVideo patch applied");
      }
    } catch (e) {
      console.warn("[FMARK] Failed to patch processRawAudioVideo:", e);
    }

    // Patch uploadMedia for PTV videos
    try {
      const resUpload = patcher(["uploadMedia"], null, (mod) => {
        if (typeof mod.uploadMedia !== "function" || mod.uploadMedia.__fmarkUploadPatched) return;

        const original = mod.uploadMedia;
        const wrapped = async function (...args) {
          const [data] = args;
          
          // Convert ptv to video for upload
          if (data && data.mediaType === "ptv") {
            data.mediaType = "video";
            return await original.call(this, data);
          }
          
          return await original.apply(this, args);
        };
        wrapped.__fmarkUploadPatched = true;
        wrapped.__fmarkUploadOriginal = original;
        mod.uploadMedia = wrapped;
      });
      patchedUploadMedia = !!resUpload;
    } catch (e) {
      console.warn("[FMARK] Failed to patch uploadMedia:", e);
    }

    if (patchedVideoThumbs || patchedUploadMedia || patchedProcessRaw) {
      window._FMARK._videoPatchApplied = true;
      console.log("[FMARK] Video patches applied successfully!", {
        generateVideoThumbsAndDuration: patchedVideoThumbs,
        processRawAudioVideo: patchedProcessRaw,
        uploadMedia: patchedUploadMedia
      });
      return true;
    }

  } catch (e) {
    console.warn("[FMARK] Failed to apply video patches:", e);
  }
  return false;
}

// Auto-apply video patches when FMARK is ready
(function initVideoPatch() {
  const tryApply = () => {
    if (window.FMARK && typeof window.FMARK.patchModuleByFunctions === "function") {
      fmarkEnsureVideoPatch();
      return true;
    }
    return false;
  };
  
  if (!tryApply()) {
    const checkInterval = setInterval(() => {
      if (tryApply()) {
        clearInterval(checkInterval);
      }
    }, 1000);
    // Stop checking after 30 seconds
    setTimeout(() => clearInterval(checkInterval), 30000);
  }
})();

function prepareMessageButtons(e, t) {
  if (!t.buttons) return e;

  if (!Array.isArray(t.buttons)) {
    throw new Error("Buttons options is not an array");
  }
  if (e.type !== "chat" && t.buttons.length > 2) {
    throw new Error("Not allowed more than three buttons in file messages");
  }
  if (t.buttons.length === 0 || t.buttons.length > 3) {
    throw new Error("Buttons options must have between 1 and 3 options");
  }
  if (t.buttons.some((btn) => btn.phoneNumber || btn.url) && t.buttons.some((btn) => btn.id && btn.text)) {
    throw new Error("It is not possible to send reply buttons and action buttons together");
  }

  fmarkEnsureButtonsTransportPatch();

  e.title = t.title || "";
  e.footer = t.footer || "";

  e.interactiveMessage = {
    header: {
      title: t.title || " ",
      hasMediaAttachment: false,
    },
    body: {
      text: e.body || " ",
    },
    footer: {
      text: t.footer || " ",
    },
    nativeFlowMessage: {
      buttons: t.buttons.map((button, index) => {
        if ("phoneNumber" in button) {
          return {
            name: "cta_call",
            buttonParamsJson: JSON.stringify({
              display_text: button.text,
              phone_number: button.phoneNumber,
            }),
          };
        }
        if ("url" in button) {
          return {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
              display_text: button.text,
              url: button.url,
              merchant_url: button.url,
            }),
          };
        }
        if ("code" in button) {
          return {
            name: "cta_copy",
            buttonParamsJson: JSON.stringify({
              display_text: button.text,
              copy_code: button.code,
            }),
          };
        }
        if ("raw" in button) {
          return button.raw;
        }
        return {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: button.text,
            id: button.id || `${index}`,
          }),
        };
      }),
    },
  };

  e.isFromTemplate = true;
  e.hydratedButtons = t.buttons.map((button, index) => {
    if ("phoneNumber" in button) {
      return {
        index: index,
        callButton: {
          displayText: button.text,
          phoneNumber: button.phoneNumber,
        },
      };
    }
    if ("url" in button) {
      return {
        index: index,
        urlButton: {
          displayText: button.text,
          url: button.url,
        },
      };
    }
    if ("code" in button) {
      return {
        index: index,
        urlButton: {
          displayText: button.text,
          url: `https://www.whatsapp.com/otp/code/?otp_type=COPY_CODE&code=otp${button.code}`,
        },
      };
    }
    return {
      index: index,
      quickReplyButton: {
        displayText: button.text,
        id: button.id || `${index}`,
      },
    };
  });

  return e;
}

/**
 * Envia arquivo/mídia a partir de um DataURL base64 (usa `MediaPrep`).
 *
 * @example
 * ```js
 * await FMARK.sendFileMessage('5511...@c.us', 'data:video/mp4;base64,...', { type: 'video', caption: 'Oi' });
 * await FMARK.sendFileMessage('5511...@c.us', 'data:audio/ogg;codecs=opus;base64,...', { type: 'audio', isPtt: true });
 * ```
 *
 * @param {string} chatId ChatId destino.
 * @param {string} content DataURL base64 (`data:*;base64,...`).
 * @param {object} [options] Opções de envio (ex: `type`, `caption`, `filename`, `forceDocument`, `isPtt`).
 * @returns {Promise<any>} Mensagem/true ou objeto de erro (compat).
 */

window.FMARK.sendFileMessage = async function (chatId, content, options = {}) {
  try {
    // Apply video patches for Chromium/headless browser compatibility
    fmarkEnsureVideoPatch();
    
    // 1) Resolve o chat (findOrCreate)
    const getLid = await window.FMARK.getLidFromPhoneID(chatId);
    const resolvedId = getLid || (typeof chatId === "string" ? chatId : chatId?._serialized);
    if (!resolvedId) {
      throw new Error("ChatId invalido");
    }
    const userWid = Store.WidFactory.createWid(resolvedId);
    const origin = options.origin || "username_contactless_search";
    const findOpts = { forceUsync: true };

    const { created, chat } = await Store.FindChat.findOrCreateLatestChat(userWid, origin, findOpts);
    const targetChat = chat ?? Store.Chat.get(userWid);

    if (!targetChat) {
      throw new Error(`Chat não encontrado para: ${chatId}`);
    }

    // 2) Marcar como lido se solicitado
    if (options.markIsRead && Store.ReadSeen && Store.ReadSeen.sendSeen) {
      try {
        await Store.ReadSeen.sendSeen({targetChat});
      } catch {}
    }

    // 3) Gerar ID da mensagem
    const fromWid = await Store.UserPrefs.getMaybeMePnUser();
    const msgId = await window.FMARK.generateMessageID(targetChat.id._serialized);
    const now = Math.floor(Date.now() / 1000);
    const eph =
      Store.EphemeralFields && Store.EphemeralFields.getEphemeralFields
        ? Store.EphemeralFields.getEphemeralFields(targetChat)
        : {};

    // 4) Processar o arquivo
    const file = window.FMARK.base64ImageToFile(content, options.filename);
    const filename = file.name;
    const opaqueData = await Store.OpaqueData.createFromData(file, file.type);

    // 5) Configurar opções de mídia com base no tipo
    const rawMediaOptions = {};
    let isViewOnce = false;
    let mediaType = options.type || "auto-detect";

    // Detectar tipo se for auto-detect
    if (mediaType === "auto-detect") {
      if (file.type.startsWith("image/")) mediaType = "image";
      else if (file.type.startsWith("video/")) mediaType = "video";
      else if (file.type.startsWith("audio/")) mediaType = "audio";
      else mediaType = "document";
    }

    // Configurar opções específicas do tipo
    const forceDocument = options.forceDocument === true;
    const isVcardOverMmsDocument = options.isVcardOverMmsDocument ?? false;
    const uploadLimitFn =
      Store.getUploadLimit && typeof Store.getUploadLimit === "function"
        ? Store.getUploadLimit
        : Store.getUploadOptions && typeof Store.getUploadOptions.getUploadLimit === "function"
          ? Store.getUploadOptions.getUploadLimit
          : typeof Store.getUploadOptions === "function"
            ? Store.getUploadOptions
            : null;

    const uploadLimit = uploadLimitFn ? uploadLimitFn(mediaType, null, isVcardOverMmsDocument) : null;

    if (forceDocument || (uploadLimit && file.size > uploadLimit)) {
      mediaType = "document";
    }

    switch (mediaType) {
      case "audio":
        rawMediaOptions.isPtt = options.isPtt || false;
        if (options.waveform !== false) {
          rawMediaOptions.precomputedFields = await prepareAudioWaveform(options, file);
        }
        break;
      case "image":
        isViewOnce = options.isViewOnce || false;
        break;
      case "video":
        rawMediaOptions.asGif = options.isGif || false;
        break;
      case "document":
        rawMediaOptions.asDocument = true;
        break;
      case "sticker":
        rawMediaOptions.asSticker = true;
        break;
      case "ptv":
        rawMediaOptions.isPtv = true;
        break;
    }

    // 6) Preparar a mídia
    const mediaPrep = Store.MediaPrep.prepRawMedia(opaqueData, rawMediaOptions);
    await mediaPrep.waitForPrep();

    // 7) Ajustar para PTV se necessário
    if (options.isPtv) {
      mediaPrep._mediaData.type = "ptv";
      mediaPrep._mediaData.fullHeight = 1128;
      mediaPrep._mediaData.fullWidth = 1128;
    }

    // 8) Criar payload da mensagem
    let rawMessage = {
      id: msgId,
      ack: 1,
      from: fromWid,
      to: userWid,
      local: true,
      self: "out",
      t: now,
      isNewMsg: true,
      caption: options.caption || null,
      disappearingModeInitiator: "chat",
      disappearingModeTrigger: "chat_settings",
      filename: filename,
      isCaptionByUser: false,
      ...eph,
    };

    // 9) Adicionar campos específicos para bot
    if (targetChat.id.isBot && targetChat.id.isBot()) {
      rawMessage = {
        ...rawMessage,
        messageSecret: await Store.genBotMsgSecretFromMsgSecret(crypto.getRandomValues(new Uint8Array(32))),
        botPersonaId: Store.BotProfileCollection.get(targetChat.id.toString())?.personaId,
      };
    }

    console.log("Sending file message:", JSON.stringify(rawMessage));

    // 10) Enviar a mídia
    const sendMsgResult = mediaPrep.sendToChat(targetChat, {
      caption: options.caption || null,
      footer: options.footer || null,
      isViewOnce,
      productMsgOptions: rawMessage,
    });

    // 11) Aguardar confirmação
    const message = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        targetChat.msgs.off("add", messageHandler);
        reject(new Error("Timeout waiting for message confirmation"));
      }, 30000);

      function messageHandler(msg) {
        if (msg.id === rawMessage.id) {
          clearTimeout(timeout);
          targetChat.msgs.off("add", messageHandler);
          resolve(msg);
        }
      }

      targetChat.msgs.on("add", messageHandler);
    });

    // 12) Verificar resultado
    if (sendMsgResult?.then) {
      const result = await sendMsgResult;
      if (result?.messageSendResult) {
        const status = result.messageSendResult.toLowerCase();
        if (status === "success" || status === "ok") {
          return message || true;
        } else {
          throw new Error(`Failed to send file: ${result.messageSendResult}`);
        }
      }
    }

    return message || true;
  } catch (error) {
    console.error("Error in sendFileMessage:", error);

    // Retornar objeto de erro estruturado
    return {
      success: false,
      error: error.message,
      stack: error.stack,
    };
  }
};

// ================== BOT AND EVENTS ==================
/* Bot WaGroup */

window.FMARK.config_script = { bot_action: false };
window.FMARK.messages_bot_group = [];
window.FMARK.groups_monitor = [];

window.FMARK.RegisterPoolVote = async function () {
  window.FMARK.onPollResponse(async function (msg) {
    if (chrome?.webview?.hostObjects?.JavaScriptConnectSharp) {
      try {
        console.log("nova resposta pool");
        const selectedOption = msg?.selectedOptions?.filter((option) => option !== null)[0];
        var objMessage = {
          id: msg?.msgId?.id,
          idGroup: msg?.msgId?.remote?._serialized,
          idAuthor: msg?.sender?.user,
          nameAuthor: undefined,
          idMessage: msg?.msgId?._serialized,
          message: selectedOption ? selectedOption.name : "",
          quant_msg: undefined,
          subtype: "pool",
          type: "chat",
          isgroup: msg?.msgId?.remote?._serialized == "g.us",
          isAdmin: msg?.msgId?.participant == msg?.sender?._serialized,
          isNewMsg: true,
          recipients: undefined,
        };
        console.log(JSON.stringify(objMessage));
        var isObjectExists = window.FMARK.messages_bot_group.some(
          (e) => JSON.stringify(e) === JSON.stringify(objMessage),
        );
        if (!isObjectExists && objMessage?.message !== undefined) {
          window.FMARK.botactionClearMessage(objMessage);
          chrome.webview.hostObjects.JavaScriptConnectSharp.update_bot(JSON.stringify(window.FMARK.messages_bot_group));
        }
      } catch (error) {
        console.error("Erro ao chamar o método update_bot:", error);
      }
    } else {
      console.log("JavaScriptConnectSharp não está definido. Ignorando chamada de método.");
    }
  });
};

window.FMARK.botGroupAddInicialize = async function () {
  try {
    setTimeout(() => {
      setInterval(async () => {
        try {
          if (!window.FMARK.config_script?.bot_action || !window.FMARK.groups_monitor?.length) return;

          console.log("Bot ativado");
          for (const groupId of window.FMARK.groups_monitor) {
            await processGroup(groupId);
          }
        } catch (e) {
          console.error("Erro no loop principal:", e);
        }
      }, 2000);
    }, 500);
  } catch (e) {
    console.error("Erro na inicialização:", e);
  }
};

window.FMARK.bot_start_time = Date.now();

// 2. Modificar a função de processamento para verificar timestamp
async function processGroup(groupId) {
  try {
    const chat = Store.Chat.get(groupId);
    if (!chat) return;

    const msgs = chat.msgs?.getModelsArray();
    if (!msgs?.length) return;

    const lastMsg = msgs[msgs.length - 1];
    const isCommunity = chat.groupMetadata?.groupType === "COMMUNITY";

    // NOVA VERIFICAÇÃO: Só processa mensagens após a inicialização do bot
    const messageTimestamp = lastMsg?.t || 0;
    if (messageTimestamp * 1000 < window.FMARK.bot_start_time) {
      console.log("Mensagem antiga ignorada:", lastMsg?.id?.id);
      return;
    }

    let toProcess = isCommunity ? window.FMARK.getGroupParent(chat) || [] : [lastMsg].filter(Boolean);

    if (toProcess.length && lastMsg?.id?.id && !window.FMARK.botisMessageIdExists(lastMsg.id.id)) {
      await createMessageObject(toProcess, isCommunity, groupId);
      updateBotViaWebView();
    }
  } catch (e) {
    console.error(`Erro no grupo ${groupId}:`, e);
  }
}

async function createMessageObject(groups, isCommunity, communityId) {
  for (const group of groups) {
    try {
      console.log(group);
      if (!group?.id?.id) {
        group.id = group.id || {};
        group.id.id = await Store.MsgKey.newId();
      }

      // NOVA VERIFICAÇÃO: Para eventos de entrada/saída, verificar se são realmente novos
      const messageTimestamp = group?.t || 0;
      const isJoinLeaveEvent =
        group?.subtype === "invite" || group?.subtype === "linked_group_join" || group?.subtype === "leave";

      if (isJoinLeaveEvent && messageTimestamp * 1000 < window.FMARK.bot_start_time) {
        console.log("Evento de entrada/saída antigo ignorado:", group?.subtype);
        continue;
      }

      let isAdmin = false;
      try {
        isAdmin =
          Store.GroupMetadata.get(group?.id?.remote?._serialized)?.participants?.get(
            group?.id?.participant?._serialized,
          )?.isAdmin || false;
      } catch {}

      var idAuthorResolve = group.recipients?.[0] || group.senderObj?.id || group.senderObj?.phoneNumber || "";

      window.FMARK.botactionClearMessage({
        id: group?.id?.id,
        idGroup: group?.id?.remote?._serialized || "",
        idAuthor: idAuthorResolve.isLid() ? Store.WeblidPnCache.getPhoneNumber(idAuthorResolve) : idAuthorResolve,
        nameAuthor: group?.notifyName || "",
        idMessage: group?.id?._serialized || "",
        message: group?.body || "",
        quant_msg: group?.count || 0,
        subtype: group?.subtype || "",
        type: group?.type || "",
        isgroup: group?.id?.remote?.server === "g.us",
        isAdmin,
        isNewMsg: group?.isNewMsg || false,
        isCommunity,
        community: communityId || "",
        recipients: group?.recipients || [],
        timestamp: messageTimestamp, // Adicionar timestamp para controle futuro
      });
    } catch (e) {
      console.error("Erro ao criar mensagem:", e);
    }
  }
}

function updateBotViaWebView() {
  try {
    chrome?.webview?.hostObjects?.JavaScriptConnectSharp?.update_bot?.(JSON.stringify(window.FMARK.messages_bot_group));
  } catch (e) {
    console.error("Erro WebView:", e);
  }
}

window.FMARK.botactionClearMessage = function (messageObj) {
  try {
    window.FMARK.messages_bot_group = window.FMARK.messages_bot_group || [];
    window.FMARK.processed_messages = window.FMARK.processed_messages || new Set();

    // Adiciona ao histórico de processadas
    window.FMARK.processed_messages.add(messageObj.id);

    window.FMARK.messages_bot_group.push(messageObj);
    if (window.FMARK.messages_bot_group.length > 60) {
      window.FMARK.messages_bot_group.shift();
    }

    // Limita o tamanho do Set de mensagens processadas
    if (window.FMARK.processed_messages.size > 1000) {
      const oldestEntries = Array.from(window.FMARK.processed_messages).slice(0, 200);
      oldestEntries.forEach((id) => window.FMARK.processed_messages.delete(id));
    }
  } catch (e) {
    console.error("Erro ao limpar mensagem:", e);
  }
};

window.FMARK.botactionRemoveMessage = function (messageId) {
  try {
    if (window.FMARK.messages_bot_group && messageId) {
      window.FMARK.messages_bot_group = window.FMARK.messages_bot_group.filter((obj) => obj.id !== messageId);
    }
  } catch (e) {
    console.error("Erro ao remover mensagem:", e);
  }
};

window.FMARK.processed_messages = new Set();

window.FMARK.botisMessageIdExists = function (messageId) {
  try {
    // Verifica tanto na lista atual quanto no histórico de processadas
    const existsInArray = window.FMARK.messages_bot_group?.some((obj) => obj.id === messageId) || false;
    const existsInProcessed = window.FMARK.processed_messages.has(messageId);

    return existsInArray || existsInProcessed;
  } catch (e) {
    console.error("Erro ao verificar mensagem:", e);
    return false;
  }
};

window.FMARK.getGroupParent = function (group) {
  // Verifica se o grupo tem subgrupos
  if (group?.groupMetadata.joinedSubgroups) {
    // Filtra os subgrupos que possuem novas mensagens
    var filterGroups = group.groupMetadata.joinedSubgroups.filter((subgroupId) => {
      var chat = Store.Chat.get(subgroupId);
      if (!chat) return false; // Certifica que o chat existe

      var msgsEvent = chat.msgs.getModelsArray();
      var lastMessage = msgsEvent[msgsEvent.length - 1];

      // Retorna true se a última mensagem do subgrupo for uma nova mensagem
      return lastMessage?.isNewMsg;
    });

    // Mapeia para retornar apenas a última mensagem de cada subgrupo
    return filterGroups.map((subgroupId) => {
      var chat = Store.Chat.get(subgroupId);
      var msgsEvent = chat.msgs.getModelsArray();
      return msgsEvent[msgsEvent.length - 1]; // Retorna a última mensagem
    });
  }
  // Se o grupo não tem subgrupos, retorna uma lista vazia
  return [];
};

/* WaSender */

window.customEventTriggered = false;

window.FMARK.initializeMessagesBOTGPT = function () {
  /*WPP.on('chat.new_message', async (e) => {
        console.log("bot_gpt:", e);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if(e.type === "ptt"){
            e.body = (await window.FMARK.decryptMediaToBase64(e))?.data;
        }
        
        var result = {
            commandType: 'BOT_GPT_chegou',
            command: e
        };
        
        if(window.chrome.webview) {
            window.chrome.webview.postMessage(result);
        }
    });*/

  Store.Msg.on("add", async (e) => {
    console.log("bot_gpt:", e);

    if (e.isNewMsg) {
      if (e.type !== "chat" && e.type !== "ptt") return;

      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (e.type === "ptt") {
        e.body = (await window.FMARK.decryptMediaToBase64(e))?.data;
      }

      var result = {
        commandType: "BOT_GPT_chegou",
        command: e,
      };

      if (window.chrome.webview) {
        window.chrome.webview.postMessage(result);
      }
    }
  });
};

window.FMARK.onPollResponse(function (msg) {
    simulatePollResponse(msg);
    var result1 = {};
    result1.commandType = "voto_poll";
    result1.command = msg;
    if (window.chrome && window.chrome.webview) {
      window.chrome.webview.postMessage(result1);
    }
  });

function activatePollResponseListener() {
  window.FMARK.onPollResponse(function (msg) {
    simulatePollResponse(msg);
    var result1 = {};
    result1.commandType = "voto_poll";
    result1.command = msg;
    if (window.chrome && window.chrome.webview) {
      window.chrome.webview.postMessage(result1);
    }
  });
}

function simulatePollResponse(msg) {
  var resultpoll = {
    commandType: "Voto na pool",
    command: msg,
  };

  var event = new CustomEvent("pollResponseEvent", { detail: { resultpoll } });
  document.dispatchEvent(event);

  window.customEventTriggered = true;
  window.customEventMessage = JSON.stringify(msg);
}

document.addEventListener("triggerPollResponse", function (event) {
  var msg = event.detail.msg;
  simulatePollResponse(msg);
});

window.FMARK.sendConversationSeen = async function (id) {
  await window.FMARK.markIsRead(id);
  setTimeout(function () {
    window.FMARK.markIsUnread(id);
  }, 500);
};

window.FMARK.checkNumberStatus2 = async function (id) {
  const result = await window.FMARK.queryExists(id);

  if (!result) {
    return {
      id: id,
      isBusiness: false,
      canReceiveMessage: false,
      numberExists: false,
      status: 404,
    };
  }
  return {
    id: result.wid,
    isBusiness: result.biz,
    canReceiveMessage: true,
    numberExists: true,
    status: 200,
  };
};

window.FMARK.checkNumberStatus3 = async function (id, arr) {
  let _res = {};

  try {
    // Função para validar e criar Wid
    function createWid(contactId) {
      if (typeof contactId === "string") {
        return window.Store.WidFactory.createWid(contactId);
      }
      return contactId;
    }

    const wid = createWid(id);
    const cleanId = `+${wid.toString()}`;

    // Usar as classes internas do WhatsApp Web
    const syncUser = new Store.optionsCheckNumberUser.USyncUser();
    const syncQuery = new Store.optionsCheckNumberQuery.USyncQuery();

    const isLid = wid.isLid();

    if (isLid) {
      syncUser.withId(wid);
    } else {
      syncQuery.withContactProtocol();
      syncUser.withPhone(cleanId.replace("@c.us", ""));

      if (wid.isUser()) {
        try {
          const lid = window.Store.ApiContact.getCurrentLid(
            window.Store.WidFactory.createUserWid(cleanId.replace("+", "")),
          );
          if (lid) {
            syncUser.withLid(lid);
          }
        } catch (e) {
          // Ignorar erro se não conseguir obter LID
        }
      }
    }

    syncQuery
      .withUser(syncUser)
      .withBusinessProtocol()
      .withDisappearingModeProtocol()
      .withStatusProtocol()
      .withLidProtocol();

    const get = await syncQuery.execute();
    let result = null;

    // Verificar se houve erro
    if (get?.error?.all || get?.error?.contact) {
      result = null;
    } else if (Array.isArray(get.list) && get.list.length > 0) {
      const contact = get.list[0];

      // Verificar se o contato é válido
      if (contact?.contact?.type === "out") {
        result = null;
      } else {
        result = {
          wid: contact.id,
          biz: typeof contact.business !== "undefined",
          bizInfo: contact.business,
          disappearingMode:
            typeof contact.disappearing_mode !== "undefined"
              ? {
                  duration: contact.disappearing_mode?.duration,
                  settingTimestamp: contact.disappearing_mode?.t,
                }
              : undefined,
          status: contact.status,
        };
      }
    }

    // Montar resposta
    if (!result) {
      _res = {
        id: id,
        isBusiness: false,
        canReceiveMessage: false,
        numberExists: false,
        status: 404,
      };
    } else {
      _res = {
        id: id,
        isBusiness: result.biz || false,
        canReceiveMessage: true,
        numberExists: true,
        status: 200,
      };
    }
  } catch (err) {
    console.error("Erro na verificação:", err);
    _res = {
      id: id,
      isBusiness: false,
      canReceiveMessage: false,
      numberExists: false,
      status: 404,
    };
  }

  if (arr && Array.isArray(arr)) {
    arr.push(_res);
  }

  return _res;
};

window.FMARK.checkNumberStatus4 = function (ids, arr) {
  for (var _i = 0; _i < ids.length; _i++) {
    window.FMARK.checkNumberStatus3(ids[_i] + "@c.us", arr);
  }
};

/*window.FMARK.getAllUnreadMessages = async function() {
            return Store.Chat._models.filter(chat => chat.unreadCount && chat.unreadCount > 0).map(unreadChat => unreadChat.msgs._models.slice(-1 * unreadChat.unreadCount)).flat().map(FMARK._serializeMessageObj);
};*/

window.FMARK.getAllUnreadMessages = async function () {
  try {
    const unreadChats = Store.Chat._models.filter((chat) => chat.unreadCount && chat.unreadCount > 0);
    const allMessages = [];
    unreadChats.forEach((chat) => {
      const chatMessages = chat.msgs._models.slice(-1 * chat.unreadCount).map(FMARK._serializeMessageObj);
      chatMessages.forEach((message) => {
        message.chat = {
          hasOpened: chat.hasOpened,
        };
        message.notifyName = chat.contact.pushname;
        allMessages.push(message);
      });
    });
    return allMessages;
  } catch (error) {
    console.error("Error getting all unread messages:", error);
    return [];
  }
};

window.FMARK.getCustomAllNewMessages = async function (isAllContacts) {
  try {
    var msgList = [];
    var OriginalList = await FMARK.getAllUnreadMessages();
    for (var i = 0; i < OriginalList.length; i++) {
      if (isAllContacts) {
        if (!OriginalList[i].chatId.server.includes("g.us") && OriginalList[i].body !== undefined) {
          msgList.push({
            id: OriginalList[i].id,
            body: OriginalList[i].body,
            chatId: OriginalList[i].chatId.user,
            name: OriginalList[i].notifyName,
          });
        }
      } else {
        if (
          !OriginalList[i].chatId.server.includes("g.us") &&
          OriginalList[i].body !== undefined &&
          OriginalList[i].chat.hasOpened !== true
        ) {
          msgList.push({
            id: OriginalList[i].id,
            body: OriginalList[i].body,
            chatId: OriginalList[i].chatId.user,
            name: OriginalList[i].notifyName,
          });
        }
      }
    }
    return JSON.stringify(msgList);
  } catch (ex) {
    console.error("Error GetAllNewMessages: " + ex.message);
    return null;
  }
};

window.FMARK.getMyContacts2 = async function (done) {
  let contacts = Store.Contact.getModelsArray();
  return contacts.filter((contact) => contact.__x_name != undefined);
};

window.FMARK.getMyContacts3 = async function (done) {
  // Obtém a lista de todos os contatos usando a função do WPP
  let contacts = Store.Contact.getModelsArray();

  // Filtra os contatos para incluir apenas aqueles que são contatos pessoais
  return contacts.filter((contact) => {
    // Verifica se o contato é pessoal usando getIsMyContact(contact)
    // e se o ID do contato existe e o servidor do ID não é 'lid'
    return window.FMARK.getIsMyContactMD(contact) ? contact.__x_id && contact.__x_id.server !== "lid" : false; // Retorna apenas contatos válidos
  });
};

/**
 * Check if number exists on WhatsApp with callback
 * @param {string} number - Phone number without @c.us
 * @param {Array} result - Array to push result into (corrected number or original)
 * @returns {Promise<void>}
 * @example
 * const arr = [];
 * await FMARK.queryExistsCustom('5511999999999', arr);
 */
window.FMARK.queryExistsCustom = async function (number, result) {
  try {
    const queryResult = await window.FMARK.queryExists(number + "@c.us");
    result.push(queryResult.wid.user);
  } catch (err) {
    result.push(number);
  }
};

/**
 * Check if can send messages to a group
 * @param {string} groupId - Group ID
 * @param {Array} result - Array to push result into
 * @returns {Promise<boolean>} - True if can send
 * @example
 * const arr = [];
 * const canSend = await FMARK.checkIsCanSend('123456789@g.us', arr);
 */
window.FMARK.checkIsCanSend = async function (groupId, result) {
  try {
    const allGroups = await FMARK.getAllGroups();
    const currentGroup = allGroups.filter((x) => x.__x_id._serialized === groupId);
    result.push(currentGroup[0].__x_canSend);
    return currentGroup[0].__x_canSend;
  } catch (err) {
    arr.push("false");
  }
};

window.FMARK.GetMessagesBuffer = function () {
  let msgList = [];
  let OriginalList = FMARK._newMessagesBuffer;

  for (i = 0; i < OriginalList.length; i++) {
    if (OriginalList[i].isGroupMsg != true && OriginalList[i].body != "") {
      msgList.push({
        id: OriginalList[i].id,
        body: OriginalList[i].body,
        typeSender: OriginalList[i].isLidMsg ? "lid" : "number",
        chatId: OriginalList[i].isLidMsg ? OriginalList[i].chatId.toString() : OriginalList[i].chatId.user,
        name: OriginalList[i].notifyName,
      });
    }
  }
  FMARK._newMessagesBuffer = [];
  return msgList;
};

window.FMARK.getAllUnreadMessagesCustom = async function (_result) {
  const msgList = [];
  const OriginalList = await FMARK.getAllUnreadMessages();
  for (let i = 0; i < OriginalList.length; i++) {
    if (OriginalList[i].chatId.server != "g.us" && OriginalList[i].self == "in") {
      msgList.push({
        id: OriginalList[i].id,
        body: OriginalList[i].body,
        chatId: OriginalList[i].chatId.user,
        name: OriginalList[i].notifyName,
      });
    }
  }
  for (let i = 0; i < msgList.length; i++) {
    _result.push(msgList[i]);
  }
};

window.FMARK.validateNumberInt = async function (number, _result) {
  try {
    const ss = await FMARK.checkNumberStatus2(number + "@c.us");
    _result.push(ss.numberExists);
  } catch (err) {
    _result.push("error");
  }
};

window.FMARK.getAllGroupsCustom = function (done) {
  const list = [];
  var allData = FMARK.getAllGroups();
  for (var i = 0; i < allData.length; i++) {
    var GrpLink = "";
    if (allData[i].__x_formattedTitle != undefined) {
      list.push({
        GroupId: allData[i].id._serialized,
        GroupName: allData[i].__x_formattedTitle.substring(0, 100),
        GroupLink: GrpLink != "" ? "https://chat.whatsapp.com/" + GrpLink : "",
      });
    }
  }
  return list;
};

/**
 * Get message authors count from a group
 * @param {string} groupId - Group ID
 * @param {Array} result - Array to push results into
 * @returns {Promise<Array>} - Array of { number } objects
 * @example
 * const authors = [];
 * await FMARK.getChatAndCount('123456789@g.us', authors);
 */
window.FMARK.getChatAndCount = async function (groupId, result) {
  const tempList = [];
  try {
    const allMessages = await window.FMARK.getMessagesMD(groupId, { count: -1 });

    for (let i = 0; i < allMessages.length; i++) {
      try {
        if (allMessages[i].__x_author !== undefined) {
          tempList.push({ number: "" + allMessages[i].__x_author.user + "" });
        }
      } catch (err) {}
    }
  } catch (err) {}
  for (let l = 0; l < tempList.length; l++) {
    result.push(tempList[l]);
  }
  return result;
};

/**
 * Get groups where I can add members
 * @param {Array} result - Array to push results into
 * @returns {Promise<Array>} - Array of { GroupId, GroupName }
 * @example
 * const groups = [];
 * await FMARK.GetMyOwnGrups(groups);
 */
window.FMARK.GetMyOwnGrups = async function (result) {
  const list = [];
  const allGroups = FMARK.getAllGroups();
  for (let i = 0; i < allGroups.length; i++) {
    try {
      const wid = Store.WidFactory.createWid(allGroups[i].__x_id._serialized);
      if (Store.GroupMetadata.get(wid).participants.canAdd()) {
        list.push({
          GroupId: allGroups[i].__x_id._serialized,
          GroupName: allGroups[i].__x_formattedTitle,
        });
      }
    } catch (err) {
      console.log(err);
    }
  }
  for (let i = 0; i < list.length; i++) {
    result.push(list[i]);
  }
  return result;
};

/**
 * Add participant to group with callback result
 * @param {string} groupId - Group ID
 * @param {string} number - Phone number without @c.us
 * @param {Array} result - Array to push result into
 * @returns {Promise<Array>} - Result array with message
 * @example
 * const result = [];
 * await FMARK.addParticipantsCustom('123456789@g.us', '5511999999999', result);
 */
window.FMARK.addParticipantsCustom = async function (groupId, number, result) {
  try {
    const addResult = await window.FMARK.groupAddParticipants(groupId, number + "@c.us");
    result.push(addResult[number + "@c.us"].message);
  } catch (err) {
    result.push("failed");
  }
  return result;
};

/**
 * Get last message from a chat (excluding self)
 * @param {string} chatId - Chat ID
 * @returns {string} - JSON stringified message body
 * @example
 * const lastMsg = FMARK.getLastMessage('5511999999999@c.us');
 */
window.FMARK.getLastMessage = function (chatId) {
  const allMessages = FMARK.getAllMessagesInChat(chatId, 1);
  const filtered = allMessages.filter(function (message) {
    return message.from && message.from.user !== chatId;
  });
  let lastMessage = null;
  if (filtered.length > 0) {
    lastMessage = filtered[filtered.length - 1];
  }
  window.bodyValue = lastMessage && lastMessage.body !== undefined ? lastMessage.body : "";
  return JSON.stringify(window.bodyValue);
};

/**
 * Get group members with optional admin filter
 * @param {string} groupId - Group ID (e.g. '123456789@g.us')
 * @param {boolean} removeAdmin - If true, excludes admins from result
 * @returns {Promise<string[]>} - Array of participant IDs
 * @example
 * const members = await FMARK.getGroupMemberCustom('123456789@g.us', true);
 */
window.FMARK.getGroupMemberCustom = async function (groupId, removeAdmin) {
  // Get group metadata
  const groupMetadata = Store.GroupMetadata.get(groupId);
  if (!groupMetadata || !groupMetadata.participants) {
    throw new Error("Group not found or has no participants.");
  }

  // Get participants list
  const participants = groupMetadata.participants.getModelsArray();

  // Filter or return based on removeAdmin
  if (removeAdmin) {
    // Remove admins
    return participants.filter((p) => !p.isAdmin).map((p) => p.id.toString());
  } else {
    // Return all participants (admins and non-admins)
    return participants.map((p) => p.id.toString());
  }
};

/**
 * Join group via invite link with callback result
 * @param {string} groupLink - Group invite link
 * @param {Array} result - Array to push result into
 * @returns {Promise<Array>} - Result array with "Success" or "failed"
 * @example
 * const result = [];
 * await FMARK.joinGroup('https://chat.whatsapp.com/ABC', result);
 */
window.FMARK.joinGroup = async function (groupLink, result) {
  try {
    await window.FMARK.groupJoin(groupLink);
    result.push("Success");
  } catch (err) {
    result.push("failed");
  }
  return result;
};

/**
 * Get group members phone numbers
 * @param {string} groupId - Group ID (e.g. '123456789@g.us')
 * @param {Array} list - Array to push member numbers into
 * @returns {Promise<Array>} - Array with member phone numbers
 * @example
 * const members = [];
 * await FMARK.getGroupMembes('123456789@g.us', members);
 */
window.FMARK.getGroupMembes = async function (groupId, list) {
  const members = (await window.FMARK.getGroupMetadata(groupId)).participants.getModelsArray();
  for (let i = 0; i < members.length; i++) {
    if (members[i].contact?.phoneNumber) {
      list.push(members[i].contact.phoneNumber.user);
    } else {
      list.push(members[i].id.user);
    }
  }
  return list;
};

/**
 * Get all saved contacts with their labels
 * @param {Array} list - Array to push contacts into
 * @returns {Promise<void>}
 * @example
 * const contacts = [];
 * await FMARK.getAllSavedContacts(contacts);
 * // contacts = [{ number, Name, Labels }, ...]
 */
window.FMARK.getAllSavedContacts = async function (list) {
  const allLabels = await window.FMARK.getAllLabelsMD();

  function findLabelNames(labelIds) {
    try {
      let labelString = "";
      for (let i = 0; i < labelIds.length; i++) {
        if (labelString !== "") {
          labelString += ",";
        }
        labelString += allLabels.find((x) => x.id === labelIds[i]).name;
      }
      return labelString;
    } catch (err) {
      return "";
    }
  }

  const allContacts = await FMARK.getMyContacts3();
  for (let i = 0; i < allContacts.length; i++) {
    console.log("contact: " + allContacts[i].id.user);
    list.push({
      number: allContacts[i].id.user,
      Name: allContacts[i].name,
      Labels: findLabelNames(allContacts[i].labels),
    });
  }
};

/**
 * Get all individual chats with their labels
 * @param {Array} [result=[]] - Array to push results into
 * @returns {Promise<Array>} - Array of { Name, number, Labels }
 * @example
 * const chats = [];
 * await FMARK.getAllChatsCustom(chats);
 */
window.FMARK.getAllChatsCustom = async function (result = []) {
  const chatList = FMARK.getAllChats();
  const allLabels = await window.FMARK.getAllLabelsMD();

  function findLabelNames(labelIds) {
    try {
      let labelString = "";
      for (let i = 0; i < labelIds.length; i++) {
        if (labelString !== "") {
          labelString += ",";
        }
        labelString += allLabels.find((x) => x.id === labelIds[i]).name;
      }
      return labelString;
    } catch (err) {
      return "";
    }
  }

  for (let i = 0; i < chatList.length; i++) {
    if (chatList[i].id.isGroup() !== true) {
      result.push({
        Name: chatList[i].contact.name === undefined ? chatList[i].contact.pushname : chatList[i].contact.name,
        number: chatList[i].id.user,
        Labels: findLabelNames(chatList[i].labels),
      });
    }
  }

  return result;
};

/**
 * Get days since first chat message
 * @param {Array} done - Array to push result into
 * @returns {Promise<number>} - Number of days since first message
 * @example
 * const result = [];
 * const days = await FMARK.GetFirstChatDays(result);
 */
window.FMARK.GetFirstChatDays = async function (done) {
  const allChatIds = FMARK.getAllChatIds();
  if (!allChatIds || allChatIds.length === 0) return 0;

  const me = window.FMARK.getMyUserId();
  const myNumber = me?.user;
  if (!myNumber) return 0;

  let lastMsg = null;

  for (let i = allChatIds.length - 1; i > 0; i--) {
    const chatId = allChatIds[i];

    if (chatId !== `${myNumber}@c.us`) {
      const messages = await window.FMARK.getMessagesMD(chatId, { count: -1 });
      const validMsgs = messages.filter((m) => ["chat", "image", "document"].includes(m.__x_type || m.type));

      if (validMsgs.length > 0) {
        lastMsg = validMsgs[0];
        if (getLastMessageDays(lastMsg.__x_t || lastMsg.t) !== 1) break;
      }
    }
  }

  if (lastMsg) {
    const days = getLastMessageDays(lastMsg.__x_t || lastMsg.t);
    const fromUser = lastMsg.__x_from?.user || lastMsg.from?.user;
    done.push({ number: fromUser, days });
    return days;
  }
  return 0;
};
/**
 * Calculate days since timestamp
 * @param {number} timestamp - Message timestamp
 * @returns {number} - Days since timestamp
 */
function getLastMessageDays(timestamp) {
  timestamp =
    timestamp >= 1e16
      ? Math.floor(timestamp / 1000000)
      : timestamp >= 1e14
        ? Math.floor(timestamp / 1000)
        : timestamp >= 1e11
          ? timestamp
          : timestamp * 1000;

  return Math.ceil(Math.abs(new Date() - new Date(timestamp)) / (1000 * 60 * 60 * 24));
}

/**
 * Get all unsaved contacts with message counts
 * @param {Array} list - Array to push results into
 * @returns {Promise<Array>} - Array of { fromMe, tome, fromNumber }
 * @example
 * const unsaved = [];
 * await FMARK.getAllUnSavedFromto(unsaved);
 */
window.FMARK.getAllUnSavedFromto = async function (list) {
  const me = window.FMARK.getMyUserId?.();
  const myNumber = me?.user;
  if (!myNumber) return [];

  const out = Array.isArray(list) ? list : [];

  const allChatsRaw = window.FMARK.getAllChats?.();
  const allChats = Array.isArray(allChatsRaw) ? allChatsRaw : [];

  // Base filter: precisa ter id, user e não ser grupo
  const directChats = allChats.filter((c) => {
    const id = c?.id;
    const isGroupFn = id?.isGroup;
    const isGroup = typeof isGroupFn === "function" ? isGroupFn.call(id) : false;

    return Boolean(id && id.user) && !isGroup;
  });

  // "Não salvo": nome undefined/null/vazio
  const unsavedChats = directChats.filter((c) => {
    const name = c?.contact?.name;
    return name == null || name === "";
  });

  for (const chat of unsavedChats) {
    const serialized = chat?.id?._serialized;
    if (!serialized) continue;

    let allMessages;
    try {
      allMessages = await window.FMARK.getMessagesMD(serialized, { count: -1 });
    } catch {
      continue; // ignora se falhar
    }

    if (!Array.isArray(allMessages) || allMessages.length === 0) continue;

    const chatMessages = allMessages.filter((m) => {
      const t = m?.type;
      return t === "chat" || t === "image" || t === "document";
    });

    if (chatMessages.length === 0) continue;

    let fromMeCount = 0;
    let toMeCount = 0;

    for (const m of chatMessages) {
      const u = m?.__x_from?.user ?? m?.from?.user;
      if (!u) continue; // se não dá pra identificar, ignora msg
      if (u === myNumber) fromMeCount++;
      else toMeCount++;
    }

    // Se não tem id.user, ignora
    const fromNumber = chat?.id?.user;
    if (!fromNumber) continue;

    out.push({
      fromMe: fromMeCount,
      tome: toMeCount,
      fromNumber,
    });
  }

  return out;
};

/**
 * Get all chats filtered by label name
 * @param {string} labelName - Label name to filter by
 * @returns {Promise<Array>} - Array of { Name, number, Labels }
 * @example
 * const chats = await FMARK.getAllChatsByLabelCustom('Important');
 */
window.FMARK.getAllChatsByLabelCustom = async function (labelName) {
  try {
    // Integrated list() function implementation
    const options = { withLabels: [labelName] };
    const maxCount = options.count == null ? Infinity : options.count;
    const direction = options.direction === "before" ? "before" : "after";

    // Get all chats
    let chats = Store.Chat.getModelsArray().slice();

    // Filter based on options
    if (options.onlyUsers) {
      chats = chats.filter((c) => c.isUser);
    }
    if (options.onlyGroups) {
      chats = chats.filter((c) => c.isGroup);
    }
    if (options.onlyCommunities) {
      chats = chats.filter((c) => c.isGroup && c.groupMetadata?.groupType === "COMMUNITY");
    }
    if (options.onlyWithUnreadMessage) {
      chats = chats.filter((c) => c.hasUnread);
    }
    if (options.withLabels) {
      const labelIds = options.withLabels.map((value) => {
        const label = Store.tagsLabels.findFirst((l) => l.name === value);
        return label ? label.id : value;
      });
      chats = chats.filter((c) => c.labels?.some((id) => labelIds.includes(id)));
    }

    // Get the chat to start from
    const indexChat = options?.id ? get(options.id) : null;
    const startIndex = indexChat ? chats.indexOf(indexChat) : 0;

    if (direction === "before") {
      const fixStartIndex = startIndex - maxCount < 0 ? 0 : startIndex - maxCount;
      const fixEndIndex = fixStartIndex + maxCount >= startIndex ? startIndex : fixStartIndex + maxCount;
      chats = chats.slice(fixStartIndex, fixEndIndex);
    } else {
      chats = chats.slice(startIndex, startIndex + maxCount);
    }

    // Attach group metadata on found chats
    for (const chat of chats) {
      if (chat.isGroup) {
        await Store.GroupMetadata.find(chat.id);
      }
    }

    // Process results
    const result = [];
    const allLabels = await window.FMARK.getAllLabelsMD();

    function findLabelNames(labelIds) {
      try {
        return labelIds.map((id) => allLabels.find((x) => x.id === id)?.name || "").join(",");
      } catch (err) {
        return "";
      }
    }

    for (let i = 0; i < chats.length; i++) {
      if (!chats[i].isGroup) {
        result.push({
          Name: chats[i].contact.name || chats[i].contact.pushname,
          number: chats[i].contact.id.isLid()
            ? Store.WeblidPnCache.getPhoneNumber(chats[i].contact.id).user
            : chats[i].contact.id.user,
          Labels: findLabelNames(chats[i].labels),
        });
      }
    }

    return JSON.stringify(result);
  } catch (err) {
    console.error("Error fetching chats:", err);
    return JSON.stringify([]); // Return empty list on error
  }
};

/**
 * Get my last message in a chat
 * @param {string} chatId - Chat ID
 * @returns {string|null|false} - Message body or null/false
 * @example
 * const lastMsg = FMARK.getMyLastMessage('5511999999999@c.us');
 */
window.FMARK.getMyLastMessage = function (chatId) {
  try {
    const chat = Store.Chat.get(chatId);
    const messages = chat && chat.msgs ? chat.msgs.getModelsArray() : [];
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg && typeof msg.isLastMessage === "function" && msg.isLastMessage()) {
        continue;
      }
      return msg && msg.body ? msg.body : null;
    }
    return null;
  } catch (e) {
    return false;
  }
};

/**
 * Decrypt media message and convert to base64
 * @param {object} msg - Message object with media
 * @returns {Promise<{success: boolean, data?: string, mimeType?: string, error?: string}>}
 * @example
 * const result = await FMARK.decryptMediaToBase64(mediaMessage);
 * if (result.success) console.log(result.data); // base64 string
 */
window.FMARK.decryptMediaToBase64 = async function (msg) {
  try {
    // Check if it has the required properties
    if (!msg.mediaKey || !msg.directPath || !msg.filehash || !msg.encFilehash) {
      console.log("Missing required media properties");
      return { success: false, error: "Missing required media properties" };
    }

    const downloadMgr = window.Store.DownloadManager.downloadManager;
    const downloadParams = {
      directPath: msg.directPath,
      encFilehash: msg.encFilehash,
      filehash: msg.filehash,
      mediaKey: msg.mediaKey,
      mediaKeyTimestamp: msg.mediaKeyTimestamp,
      type: msg.type,
      signal: new AbortController().signal,
      userDownloadAttemptCount: 0,
      isPreload: false,
      chatWid: msg.id.remote,
    };

    // Download and decrypt the media
    const buffer = await downloadMgr.downloadAndMaybeDecrypt(downloadParams);

    // Convert the buffer to base64
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }

    const base64Data = btoa(binary);
    return {
      success: true,
      data: base64Data,
      mimeType: msg.mimetype,
    };
  } catch (err) {
    console.error("Error decrypting media:", err);
    return {
      success: false,
      error: err.message || "Failed to decrypt media",
    };
  }
};

// ================== ADVANCED MODULES AND PATCHES ==================

/**
 * Find a WhatsApp module by function names
 * @param {string|string[]} functionNames - Function name(s) to search for
 * @param {string} [loadModuleName] - Optional module name to load directly
 * @returns {object|null} - { module, moduleName, foundFunctions, foundBy } or null
 * @example
 * const result = FMARK.findModuleByFunctions(['sendTextMsgToChat'], 'WAWebSendMsgToChat');
 */
window.FMARK.findModuleByFunctions = function (functionNames, loadModuleName) {
  // webpackRequire implementation like WhatsApp Web
  const __debug = () => (self || window).require("__debug");

  const webpackRequire = (id) => {
    try {
      (self || window).ErrorGuard.skipGuardGlobal(true);
      return (self || window).importNamespace(id);
    } catch (err) {
      return null;
    }
  };

  Object.defineProperty(webpackRequire, "m", {
    get: () => {
      const modulesMap = __debug().modulesMap;
      return Object.keys(modulesMap)
        .filter((id) => /^(?:use)?WA/.test(id))
        .reduce((acc, id) => {
          acc[id] = modulesMap[id]?.factory;
          return acc;
        }, {});
    },
  });

  // 1. Search by loadModuleName if specified (accepts with/without WAWeb/use)
  if (typeof loadModuleName === "string" && loadModuleName.trim() !== "") {
    const candidates = fmarkGetModuleIdCandidates(loadModuleName);

    for (const candidateName of candidates) {
      const moduleObj = webpackRequire(candidateName);
      if (!moduleObj) continue;

      // Verify functions if specified
      if (functionNames) {
        const funcNames = Array.isArray(functionNames) ? functionNames : [functionNames];
        const hasAllFuncs = funcNames.every((fn) => typeof moduleObj[fn] === "function");
        if (!hasAllFuncs) continue;
      }

      return {
        module: moduleObj,
        moduleName: candidateName,
        foundFunctions: functionNames ? (Array.isArray(functionNames) ? functionNames : [functionNames]) : [],
        foundBy: "load",
      };
    }

    return null;
  }

  // 2. Search by functions in all modules
  if (functionNames) {
    const funcNames = Array.isArray(functionNames) ? functionNames : [functionNames];

    for (const moduleName in webpackRequire.m) {
      const moduleObject = webpackRequire(moduleName);

      if (moduleObject && typeof moduleObject === "object") {
        const hasAllFuncs = funcNames.every((fn) => typeof moduleObject[fn] === "function");

        if (hasAllFuncs) {
          return {
            module: moduleObject,
            moduleName: moduleName,
            foundFunctions: funcNames,
            foundBy: "functions",
          };
        }
      }
    }
  }

  return null;
};

/**
 * Find and patch a WhatsApp module
 * @param {string|string[]} functionNames - Function name(s) to search for
 * @param {string} [loadModuleName] - Optional module name to load directly
 * @param {function} patchFn - Function to apply as patch
 * @returns {object|null} - { module, moduleName, patchedBy } or null
 * @example
 * FMARK.patchModuleByFunctions(['someFunc'], 'WAWebModule', (mod) => {
 *   mod.someFunc = function() { console.log('patched!'); };
 * });
 */
window.FMARK.patchModuleByFunctions = function (functionNames, loadModuleName, patchFn) {
  // Same webpackRequire as WhatsApp Web
  const __debug = () => (self || window).require("__debug");
  const webpackRequire = (id) => {
    try {
      (self || window).ErrorGuard.skipGuardGlobal(true);
      return (self || window).importNamespace(id);
    } catch {
      return null;
    }
  };
  Object.defineProperty(webpackRequire, "m", {
    get: () => {
      const modulesMap = __debug().modulesMap;
      return Object.keys(modulesMap)
        .filter((id) => /^(?:use)?WA/.test(id))
        .reduce((acc, id) => {
          acc[id] = modulesMap[id]?.factory;
          return acc;
        }, {});
    },
  });

  // Reuse search logic
  const finder = (moduleName) => {
    const mod = webpackRequire(moduleName);
    if (!mod) return false;
    if (functionNames) {
      const funcs = Array.isArray(functionNames) ? functionNames : [functionNames];
      return funcs.every((fn) => typeof mod[fn] === "function");
    }
    return true;
  };

  // 1. Try to load by explicit name (accepts with/without WAWeb/use)
  if (typeof loadModuleName === "string" && loadModuleName.trim()) {
    const candidates = fmarkGetModuleIdCandidates(loadModuleName);

    for (const candidateName of candidates) {
      if (finder(candidateName)) {
        const mod = webpackRequire(candidateName);
        patchFn(mod);
        return { module: mod, moduleName: candidateName, patchedBy: "load" };
      }
    }

    return null;
  }

  // 2. Search in all modules
  for (const name in webpackRequire.m) {
    if (finder(name)) {
      const mod = webpackRequire(name);
      patchFn(mod);
      return { module: mod, moduleName: name, patchedBy: "functions" };
    }
  }

  return null;
};

/***
 * HOW TO USE FINDMODULE
 *
 * // Option 1: Find by function names
 * const presenceModule = window.FMARK.findModuleByFunctions([
 *     'setPresenceAvailable',
 *     'setPresenceUnavailable'
 * ]);
 * if (presenceModule) {
 *     console.log("Module found via functions:", presenceModule.moduleName);
 * }
 *
 * // Option 2: Find by module name
 * const cmdModule = window.FMARK.findModuleByFunctions(
 *     null, // No specific function
 *     'WAWebCmd' // Module name (load)
 * );
 * if (cmdModule) {
 *     console.log("Module found by load:", cmdModule.moduleName);
 * }
 ***/

/**
 * Get messages from a chat with various filters.
 * Usa chatId como está (sem converter LID).
 * @param {string} chatId - Chat ID (usado como está, sem conversão LID)
 * @param {object} [options={}] - Options
 * @param {number} [options.count=20] - Number of messages (-1 for all)
 * @param {string} [options.direction='before'] - 'before' or 'after'
 * @param {string} [options.id] - Message ID to start from
 * @param {boolean} [options.onlyUnread] - Only unread messages
 * @param {string} [options.media] - 'all', 'image', 'audio', 'video', 'document', 'link'
 * @returns {Promise<Array>} - Array of message objects
 * @example
 * const msgs = await FMARK.getMessagesMD('5511999999999@c.us', { count: 50 });
 */
window.FMARK.getMessagesMD = async function getMessages(chatId, options = {}) {
  const rawChatId = typeof chatId === "string" ? chatId : (chatId && typeof chatId._serialized === "string" ? chatId._serialized : "");
  if (!rawChatId) return [];

  // Usa chatId como está, sem converter LID
  const wid = fmarkEnsureWid(rawChatId);
  if (!wid) return [];

  let chat;
  try {
    const r = await window.Store.FindChat.findOrCreateLatestChat(wid);
    chat = r?.chat;
  } catch {
    return [];
  }

  if (!chat) return [];

  // count
  let count = Number.isFinite(options.count) ? options.count : 20;

  const direction = options.direction === "after" ? "after" : "before";
  const lastKeyStr = chat?.lastReceivedKey?.toString?.();
  const idStr = typeof options.id === "string" && options.id.length > 0 ? options.id : (lastKeyStr || null);

  // onlyUnread
  if (options.onlyUnread) {
    if (!chat.hasUnread) return [];

    const unreadCount = typeof chat.unreadCount === "number" ? chat.unreadCount : 0;
    const safeUnread = unreadCount < 0 ? 2 : unreadCount;

    if (count < 0) count = safeUnread;
    else count = Math.min(count, safeUnread);
  }

  // evita Infinity (algumas builds do WA quebram com Infinity)
  if (count === -1) count = 100000; // grande o suficiente; ideal é paginar

  if (!options.id && idStr) count = Math.max(0, count - 1);

  /** @type {any} */
  let params;
  try {
    params = idStr ? Store.MsgKey.fromString(idStr) : { remote: chat.id };
  } catch {
    params = { remote: chat.id };
  }

  params.count = count;
  params.direction = direction;

  /** @type {any[]} */
  let msgs = [];

  const normalizeQueryResult = (result) => {
    if (Array.isArray(result)) return result;
    if (Array.isArray(result?.messages)) return result.messages;
    return [];
  };

  try {
    if (options.media === "all") {
      const r = await Store.msgFindQuery("media", params);
      msgs = normalizeQueryResult(r);
    } else if (options.media === "image") {
      const r = await Store.msgFindQuery("media", params);
      const arr = normalizeQueryResult(r);
      msgs = arr.filter((m) => (m?.type ?? m?.__x_type) === "image");
    } else if (options.media !== undefined) {
      params.media = options.media;
      const r = await Store.msgFindQuery("media", params);
      msgs = normalizeQueryResult(r);
    } else {
      const r = await Store.msgFindQuery(direction, params);
      msgs = normalizeQueryResult(r);
    }
  } catch {
    msgs = [];
  }

  // se puxou "antes" e tinha idStr, adiciona a mensagem do id também
  if (!options.id && idStr) {
    try {
      const m = Store.Msg.get(idStr);
      if (m) msgs.push(m);
    } catch {
      // ignore
    }
  }

  const looksLikeMsg = (m) => {
    if (!m || typeof m !== "object") return false;
    const type = m.__x_type ?? m.type;
    const t = m.__x_t ?? m.t;
    return (typeof type === "string" && type.length > 0) && (typeof t === "number" || typeof t === "string");
  };

  const resolveMsg = (m) => {
    if (!m) return null;

    // alguns retornos já são MsgModel, não precisa Store.Msg.get
    if (looksLikeMsg(m)) {
      if (options.onlyUnread) m.isNewMsg = true;
      return m;
    }

    const id = m?.id ?? m?.__x_id ?? null;
    if (!id) return null;

    try {
      const mm = Store.Msg.get(id);
      if (mm) {
        if (options.onlyUnread) mm.isNewMsg = true;
        return mm;
      }
    } catch {
      // ignore
    }
    return null;
  };

  return msgs.map(resolveMsg).filter(Boolean);
};

window.FMARK.markComposing = async function (chat, time) {
  try {
    // Cria o WID (WhatsApp ID) do chat
    const wid = Store.WidFactory.createWid(chat);

    // Obtém o objeto do chat
    const chatObj = Store.Chat.get(wid);

    // Verifica se o chat existe
    if (!chatObj) {
      console.error("Chat não encontrado:", chat);
      return;
    }

    // Inscreve-se na presença do chat
    chatObj.presence.subscribe();

    // Marca como "digitando..."
    Store.ChatPresence.markComposing(chatObj);

    // Limpa timeout anterior se existir
    if (chatObj.pausedTimerId) {
      clearTimeout(chatObj.pausedTimerId);
      chatObj.unset("pausedTimerId");
    }

    // Define o timeout para parar de "digitar"
    if (time) {
      chatObj.pausedTimerId = setTimeout(() => {
        // Marca como pausado (para de mostrar "digitando...")
        Store.ChatPresence.markPaused(chatObj);

        // Limpa a referência do timer
        if (chatObj.pausedTimerId) {
          chatObj.unset("pausedTimerId");
        }
      }, time);
    }
  } catch (error) {
    console.error("Erro na função markComposing:", error);
  }
};

/**
 * Mark chat as typing (alias for markComposing, WPP.chat.markIsComposing compatible)
 * @param {string} chatId - Chat ID (e.g. '5511999999999@c.us')
 * @param {number} [duration] - Duration in milliseconds to show typing status
 * @returns {Promise<void>}
 * @example
 * await FMARK.markIsComposing('5511999999999@c.us');
 * await FMARK.markIsComposing('5511999999999@c.us', 5000); // 5 seconds
 */
window.FMARK.markIsComposing = async function (chatId, duration) {
  return window.FMARK.markComposing(chatId, duration);
};

/**
 * Stop showing "typing..." status (WPP.chat.markIsPaused compatible)
 * @param {string} chatId - Chat ID (e.g. '5511999999999@c.us')
 * @returns {Promise<boolean>} - True if successful
 * @example
 * await FMARK.markIsPaused('5511999999999@c.us');
 */
window.FMARK.markIsPaused = async function (chatId) {
  try {
    const wid = Store.WidFactory.createWid(chatId);
    const chat = Store.Chat.get(wid);
    
    if (!chat) {
      console.error("[FMARK] Chat not found:", chatId);
      return false;
    }
    
    await chat.presence.subscribe();
    await Store.ChatPresence.markPaused(chat);
    
    return true;
  } catch (err) {
    console.error("[FMARK] Error in markIsPaused:", err);
    return false;
  }
};

/**
 * Mark chat as recording audio (WPP.chat.markIsRecording compatible)
 * @param {string} chatId - Chat ID (e.g. '5511999999999@c.us')
 * @param {number} [duration] - Duration in milliseconds to show recording status
 * @returns {Promise<boolean>} - True if successful
 * @example
 * await FMARK.markIsRecording('5511999999999@c.us');
 * await FMARK.markIsRecording('5511999999999@c.us', 5000); // 5 seconds
 */
window.FMARK.markIsRecording = async function (chatId, duration) {
  try {
    const wid = Store.WidFactory.createWid(chatId);
    const chat = Store.Chat.get(wid);
    
    if (!chat) {
      console.error("[FMARK] Chat not found:", chatId);
      return false;
    }
    
    await chat.presence.subscribe();
    
    if (Store.ChatPresence?.markRecording) {
      await Store.ChatPresence.markRecording(chat);
    } else if (Store.ChatStates?.sendChatStateRecording) {
      await Store.ChatStates.sendChatStateRecording(wid);
    } else {
      console.warn("[FMARK] markRecording not available");
      return false;
    }
    
    if (duration) {
      chat.pausedTimerId = setTimeout(() => {
        window.FMARK.markIsPaused(chatId);
      }, duration);
    }
    
    return true;
  } catch (err) {
    console.error("[FMARK] Error in markIsRecording:", err);
    return false;
  }
};

/**
 * Check if user is authenticated (WPP.conn.isAuthenticated compatible)
 * @returns {boolean} - True if authenticated
 * @example
 * const isAuth = FMARK.isAuthenticated();
 * console.log(isAuth); // true or false
 */
window.FMARK.isAuthenticated = function () {
  try {
    // Try native function if available
    if (Store.isAuthenticatedFn && typeof Store.isAuthenticatedFn === "function") {
      return Store.isAuthenticatedFn();
    }
    
    // Fallback: check if Contact exists and has data
    if (window.Store.Contact && window.Store.Contact.length >= 0) {
      return true;
    }
    
    // Additional fallback: check Cmd.isMainLoaded
    if (window.Store.Cmd?.isMainLoaded) {
      return true;
    }
    
    return false;
  } catch (err) {
    return false;
  }
};

/**
 * Pin duration enum (WPP.whatsapp.PinExpiryDurationOption compatible)
 * @enum {number}
 */
window.FMARK.PinExpiryDurationOption = {
  OneDay: 1,      // 24 hours
  SevenDays: 7,   // 7 days (default)
  ThirtyDays: 30, // 30 days
};

/**
 * Pin a message in chat (WPP.chat.pinMsg compatible)
 * @param {string} msgId - Message ID
 * @param {boolean} [pin=true] - True to pin, false to unpin
 * @param {number} [duration=7] - Duration (use PinExpiryDurationOption)
 * @returns {Promise<{success: boolean, error?: string, message?: object, pinned?: boolean}>}
 * @example
 * await FMARK.pinMsg('true_5511999999999@c.us_ABCDEF'); // Pin for 7 days
 * await FMARK.pinMsg('true_5511999999999@c.us_ABCDEF', true, FMARK.PinExpiryDurationOption.ThirtyDays);
 * await FMARK.pinMsg('true_5511999999999@c.us_ABCDEF', false); // Unpin
 */
window.FMARK.pinMsg = async function (msgId, pin = true, duration = 7) {
  try {
    // Normalize duration to valid enum
    let normalizedDuration = 7; // SevenDays default
    if (typeof duration === "number") {
      if (duration === 1 || duration === 7 || duration === 30) {
        normalizedDuration = duration;
      } else {
        console.warn("[FMARK.pinMsg] Invalid duration, using 7 days (default)");
      }
    }
    
    // Get message
    let msg = null;
    if (typeof msgId === "string") {
      if (Store.Msg?.get) {
        msg = Store.Msg.get(msgId);
      }
      if (!msg && Store.MsgKey) {
        const key = new Store.MsgKey(msgId);
        msg = Store.Msg.get(key);
      }
    } else {
      msg = msgId;
    }
    
    if (!msg) {
      console.error("[FMARK] Message not found:", msgId);
      return { success: false, error: "message_not_found" };
    }
    
    // Get chat
    const chat = Store.Chat.get(msg.id.remote);
    if (!chat) {
      console.error("[FMARK] Chat not found for message");
      return { success: false, error: "chat_not_found" };
    }
    
    // Check if Newsletter (cannot pin)
    if (chat.isNewsletter) {
      return { success: false, error: "cannot_pin_in_newsletter" };
    }
    
    // Check group permissions
    if (chat.isGroup) {
      const participants = chat.groupMetadata?.participants;
      if (participants && !participants.iAmMember?.()) {
        return { success: false, error: "not_a_member" };
      }
      if ((chat.groupMetadata?.restrict || chat.groupMetadata?.announce) && 
          participants && !participants.iAmAdmin?.()) {
        return { success: false, error: "not_admin" };
      }
    }
    
    // Check if message can be pinned
    if (msg.isNotification || msg.isViewOnce || msg.type === "revoked") {
      return { success: false, error: "message_cannot_be_pinned" };
    }
    
    // Check if already in desired state
    if (Store.PinInChatStore?.getByParentMsgKey) {
      const pinnedMsg = Store.PinInChatStore.getByParentMsgKey(msg.id);
      if (pinnedMsg) {
        const PIN_STATE = Store.PIN_STATE || { PIN: 1, UNPIN: 2 };
        const isPinned = pinnedMsg.pinType === PIN_STATE.PIN;
        if (isPinned === pin) {
          return { success: false, error: pin ? "already_pinned" : "already_unpinned" };
        }
      }
    }
    
    // Send pin command
    if (Store.sendPinInChatMsg) {
      const PIN_STATE = Store.PIN_STATE || { PIN: 1, UNPIN: 2 };
      const pinState = pin ? PIN_STATE.PIN : PIN_STATE.UNPIN;
      const expiryOption = pin ? normalizedDuration : undefined;
      
      const result = await Store.sendPinInChatMsg(msg, pinState, expiryOption);
      
      if (!result) {
        return { success: false, error: "pin_failed" };
      }
      
      return {
        success: true,
        message: msg,
        pinned: pin,
        result: result,
      };
    }
    
    console.warn("[FMARK] sendPinInChatMsg not available");
    return { success: false, error: "pin_not_available" };
  } catch (err) {
    console.error("[FMARK] Error in pinMsg:", err);
    return { success: false, error: err.message || "unknown_error" };
  }
};

/**
 * Unpin a message in chat (alias for pinMsg with pin=false)
 * @param {string} msgId - Message ID
 * @returns {Promise<{success: boolean, error?: string}>}
 * @example
 * await FMARK.unpinMsg('true_5511999999999@c.us_ABCDEF');
 */
window.FMARK.unpinMsg = async function (msgId) {
  return window.FMARK.pinMsg(msgId, false);
};

/**
 * List chats with filters (WPP.chat.list compatible)
 * @param {Object} [options={}] - Filter options
 * @param {number} [options.count] - Number of chats to return
 * @param {boolean} [options.onlyUsers] - Only individual chats
 * @param {boolean} [options.onlyGroups] - Only group chats
 * @param {boolean} [options.onlyCommunities] - Only communities
 * @param {boolean} [options.onlyWithUnreadMessage] - Only with unread messages
 * @param {boolean} [options.onlyArchived] - Only archived chats
 * @param {string[]} [options.withLabels] - Filter by label names or IDs
 * @returns {Promise<Array>} - Array of chat objects
 * @example
 * const allChats = await FMARK.chatList();
 * const groups = await FMARK.chatList({onlyGroups: true});
 * const labeled = await FMARK.chatList({withLabels: ['Important']});
 */
window.FMARK.chatList = async function (options = {}) {
  try {
    const maxCount = options.count == null ? Infinity : options.count;
    
    // Get all chats
    let chats = Store.Chat.getModelsArray ? Store.Chat.getModelsArray().slice() : 
                (Store.Chat._models ? Store.Chat._models.slice() : []);
    
    // Filter by type
    if (options.onlyUsers) {
      chats = chats.filter((c) => c.isUser);
    }
    
    if (options.onlyGroups) {
      chats = chats.filter((c) => c.isGroup);
    }
    
    if (options.onlyCommunities) {
      chats = chats.filter((c) => c.isGroup && c.groupMetadata?.groupType === "COMMUNITY");
    }
    
    if (options.onlyWithUnreadMessage) {
      chats = chats.filter((c) => c.hasUnread || c.unreadCount > 0);
    }
    
    if (options.onlyArchived) {
      chats = chats.filter((c) => c.archive);
    }
    
    // Filter by labels
    if (options.withLabels && Array.isArray(options.withLabels)) {
      const labelStore = Store.tagsLabels || Store.Label;
      if (labelStore) {
        const labelIds = options.withLabels.map((value) => {
          if (labelStore.findFirst) {
            const label = labelStore.findFirst((l) => l.name === value);
            return label ? label.id : value;
          }
          return value;
        });
        
        chats = chats.filter((c) => c.labels?.some((id) => labelIds.includes(id)));
      }
    }
    
    // Limit count
    if (maxCount !== Infinity) {
      chats = chats.slice(0, maxCount);
    }
    
    // Serialize results
    return chats.map((chat) => {
      try {
        return {
          id: chat.id?._serialized || chat.id?.toString() || null,
          name: chat.name || chat.contact?.name || chat.formattedTitle || null,
          isGroup: chat.isGroup || false,
          isUser: chat.isUser || false,
          unreadCount: chat.unreadCount || 0,
          archive: chat.archive || false,
          pinned: chat.pin || false,
          labels: chat.labels || [],
          lastMessage: chat.lastReceivedKey?._serialized || null,
          timestamp: chat.t || null,
        };
      } catch (e) {
        return { id: chat.id?.toString(), error: true };
      }
    });
  } catch (err) {
    console.error("[FMARK] Error in chatList:", err);
    return [];
  }
};

/**
 * Get group participants (alias for groupGetParticipants, WPP.group.getParticipants compatible)
 * @param {string} groupId - Group ID (e.g. '123456789@g.us')
 * @returns {Promise<Array>} - Array of participant objects
 * @example
 * const participants = await FMARK.getParticipants('123456789@g.us');
 */
window.FMARK.getParticipants = async function (groupId) {
  return window.FMARK.groupGetParticipants(groupId);
};

/**
 * Check if can add member to group (alias for groupCanAdd, WPP.group.canAdd compatible)
 * @param {string} groupId - Group ID (e.g. '123456789@g.us')
 * @returns {Promise<boolean>} - True if can add members
 * @example
 * const canAdd = await FMARK.canAdd('123456789@g.us');
 */
window.FMARK.canAdd = async function (groupId) {
  return window.FMARK.groupCanAdd(groupId);
};

window.FMARK.getAllLabelsMD = async function () {
  const labels = Store.tagsLabels.getModelsArray();
  return labels.map((e) => {
    // Calcula o count usando a lógica do patchLabelCount
    let count = 0;
    try {
      for (const item of e.labelItemCollection._models) {
        if (item.parentType !== "Chat") continue;
        const chat = Store.Chat.get(item.parentId);
        if (!chat?.archive) count += 1;
      }
    } catch (e) {}

    return {
      id: e?.id || "",
      name: e?.name || "",
      color: e.hexColor ? assertColor(e.hexColor) : null,
      count: count, // Usa o count calculado em vez de e.count
      hexColor: Store.ColorLabelIndexToHex.colorIndexToHex(e.colorIndex),
      colorIndex: e.colorIndex,
    };
  });
};

/**
 * Resolve um ID para o melhor destino de chat (prioriza LID quando disponível).
 *
 * Se a migração LID estiver habilitada, tenta obter o LID e usa `MessageProcessUtils.selectChatForOneOnOneMessage`.
 * Pode funcionar para números não salvos (depende do WhatsApp conseguir sincronizar/consultar).
 *
 * @example
 * ```js
 * const resolved = await FMARK.getLidFromPhoneID('5511999999999@c.us');
 * console.log(resolved); // '2018...@lid' ou '5511...@c.us'
 * ```
 *
 * @param {string|object} id `...@c.us`, `...@lid`, `...@g.us` ou Wid-like.
 * @returns {Promise<string|null>} ID resolvido ou `null`.
 */
window.FMARK.getLidFromPhoneID = async function (id) {
  try {
    if (!id) {
      console.error("ID nao fornecido");
      return null;
    }

    const wid = fmarkEnsureWid(id);
    if (!wid) return null;

    const toStringWid = (w) => (w && typeof w.toString === "function" ? w.toString() : String(w));

    if (wid.isGroup && wid.isGroup()) {
      return toStringWid(wid);
    }

    const migrated = fmarkIsLidMigrationEnabled();
    const isLid = wid.isLid && wid.isLid();
    const isUser = wid.isUser && wid.isUser();

    // Migration rules (WAWebFindChatAction): convert target -> lid -> select destination chat
    // Applies for both PN and LID targets when the migration is enabled.
    if (migrated && isUser) {
      let lid = fmarkGetCurrentLid(wid);

      if (!lid && Store.SyncContactJob?.syncContactListJob) {
        try {
          await Store.SyncContactJob.syncContactListJob([wid], true, "query");
        } catch {}
        lid = fmarkGetCurrentLid(wid);
      }

      if (!lid && Store.LidMigrationUtils?.toUserLidOrThrow) {
        try {
          lid = Store.LidMigrationUtils.toUserLidOrThrow(wid);
        } catch {}
      }

      if (!lid && Store.ContactSyncApi?.syncContactListInChunks) {
        try {
          await Store.ContactSyncApi.syncContactListInChunks({
            contactIds: [wid],
            shouldDelayBetweenChunks: false,
            mode: "full",
          });
        } catch {}
        lid = fmarkGetCurrentLid(wid);
      }

      if (lid) {
        const lidWid = fmarkEnsureWid(lid) || lid;
        if (Store.MessageProcessUtils?.selectChatForOneOnOneMessage) {
          try {
            const selected = await Store.MessageProcessUtils.selectChatForOneOnOneMessage({ lid: lidWid });
            const selectedChat = selected?.chatId || selected?.chatWid;
            if (selectedChat) {
              return toStringWid(selectedChat);
            }
          } catch {}
        }
        return toStringWid(lidWid);
      }

      return toStringWid(wid);
    }

    // Pre-migration rules (WAWebFindChatAction): only convert LID -> PN if the LID chat doesn't exist
    if (isLid && !migrated) {
      try {
        let existing = null;
        if (Store.FindChat?.findExistingChat) {
          existing = await Store.FindChat.findExistingChat(wid);
        } else {
          existing = Store.Chat?.get(wid);
        }
        if (existing && existing.id) {
          return toStringWid(existing.id);
        }
      } catch {}

      const pn = fmarkGetPnFromLid(wid);
      const pnWid = fmarkEnsureWid(pn);
      return toStringWid(pnWid || wid);
    }

    return toStringWid(wid);
  } catch (error) {
    console.error("Erro ao obter LID:", error.message || error);
    return null;
  }
};

// Patch temporario para voltar a funcionar getEnforceLid

window.FMARK.patchModuleByFunctions(
    ['getEnforceCurrentLid'],
    null,
    (mod) => {
        const originalGetEnforceCurrentLid = mod.getEnforceCurrentLid;

        mod.getEnforceCurrentLid = function (...args) {
            const [UserWid] = args;
            try {
                // Tenta obter o LID através do toUserLid se existir
                const toUserLid = Store.toUserLid || null;
                const LID = toUserLid ? toUserLid(UserWid) : null;

                // Se conseguiu o LID, retorna ele, senão retorna o UserWid original
                if (LID) {
                    return LID;
                }

                // Tenta chamar a função original
                return originalGetEnforceCurrentLid.call(this, ...args);
            } catch (e) {
                console.warn('[lid-migration] getEnforceCurrentLid ignorou erro para', UserWid, e);
                // Em caso de erro, retorna o UserWid
                return UserWid;
            }
        };
    }
);

// Patch 2: isLidMigrated
window.FMARK.patchModuleByFunctions(
    ['isLidMigrated'],
    null,
    (mod) => {
        const originalIsLidMigrated = mod.isLidMigrated;

        mod.isLidMigrated = function (...args) {
            try {
                // Tenta executar a função original
                return originalIsLidMigrated.call(this, ...args);
            } catch (e) {
                console.warn('[lid-migration] isLidMigrated ignorou erro', e);
                // Em caso de erro, retorna false por segurança
                return false;
            }
        };
    }
);

window.FMARK.patchModuleByFunctions(
    [
        "getIsMyContact",
        "getMentionName",
        "getNotifyName",
        "getFormattedName",
        "getFormattedShortName",
    ],
    "WAWebFrontendContactGetters",
    (ContactGetters) => {
        // 🔒 Garante que WPP existe
        if (
            !window.WPP ||
            !WPP.whatsapp ||
            !WPP.whatsapp.ContactModel ||
            !WPP.whatsapp.ContactModel.prototype
        ) {
            return;
        }

        const proto = WPP.whatsapp.ContactModel.prototype;

        const map = {
            isMyContact: ContactGetters.getIsMyContact,
            mentionName: ContactGetters.getMentionName,
            notifyName: ContactGetters.getNotifyName,
            formattedPhone: ContactGetters.getFormattedPhone,
            userid: ContactGetters.getUserid,
            userhash: ContactGetters.getUserhash,
            searchName: ContactGetters.getSearchName,
            searchVerifiedName: ContactGetters.getSearchVerifiedName,
            header: ContactGetters.getHeader,
            isMe: ContactGetters.getIsMe,
            isIAS: ContactGetters.getIsIAS,
            isSupportAccount: ContactGetters.getIsSupportAccount,
            formattedShortName: ContactGetters.getFormattedShortName,
            formattedName: ContactGetters.getFormattedName,
            formattedUser: ContactGetters.getFormattedUser,
            isWAContact: ContactGetters.getIsWAContact,
            canRequestPhoneNumber:
                ContactGetters.getCanRequestPhoneNumber,
            showBusinessCheckmarkAsPrimary:
                ContactGetters.getShowBusinessCheckmarkAsPrimary,
            showBusinessCheckmarkAsSecondary:
                ContactGetters.getShowBusinessCheckmarkAsSecondary,
            showBusinessCheckmarkInChatlist:
                ContactGetters.getShowBusinessCheckmarkInChatlist,
            isDisplayNameApproved:
                ContactGetters.getIsDisplayNameApproved,
            shouldForceBusinessUpdate:
                ContactGetters.getShouldForceBusinessUpdate,
        };

        for (const key in map) {
            if (!(key in proto) && typeof map[key] === "function") {
                Object.defineProperty(proto, key, {
                    get() {
                        return map[key](this);
                    },
                    configurable: true,
                });
            }
        }
    }
);

// ==================== WPP-COMPATIBLE NAMESPACES ====================
// These namespaces allow using FMARK with the same WPP syntax
// Example: FMARK.call.offer() instead of FMARK.callOffer()

/**
 * Call namespace (WPP.call compatible)
 * @namespace FMARK.call
 * @property {function} offer - Start a call
 * @property {function} end - End a call
 * @property {function} accept - Accept incoming call
 * @property {function} reject - Reject incoming call
 * @property {function} cancel - Cancel outgoing call
 * @property {function} getActiveCall - Get current active call
 * @property {function} getCalls - Get all calls
 * @property {function} onIncomingCall - Listen for incoming calls
 */
window.FMARK.call = {
  offer: function(to, options) {
    return window.FMARK.callOffer(to, options);
  },
  end: function(callId) {
    return window.FMARK.callEnd(callId);
  },
  accept: function(callId) {
    return window.FMARK.callAccept(callId);
  },
  reject: function(callId) {
    return window.FMARK.callReject(callId);
  },
  cancel: function(callId) {
    return window.FMARK.callCancel(callId);
  },
  getActiveCall: function() {
    return window.FMARK.getActiveCall();
  },
  getCalls: function() {
    return window.FMARK.getCalls();
  },
  onIncomingCall: function(handler) {
    return window.FMARK.onIncomingCall(handler);
  },
};

/**
 * Connection namespace (WPP.conn compatible)
 * @namespace FMARK.conn
 * @property {function} isAuthenticated - Check if authenticated
 * @property {function} isLoggedIn - Check if logged in
 * @property {function} isConnected - Check if connected
 * @property {function} getMyUserId - Get current user ID
 */
window.FMARK.conn = {
  isAuthenticated: function() {
    return window.FMARK.isAuthenticated();
  },
  isLoggedIn: function() {
    return window.FMARK.isLoggedIn();
  },
  isConnected: function() {
    return window.FMARK.isConnected();
  },
  getMyUserId: function() {
    return window.FMARK.getMyUserId();
  },
};

/**
 * Chat namespace (WPP.chat compatible)
 * @namespace FMARK.chat
 * @property {function} list - List chats with filters
 * @property {function} sendTextMessage - Send text message
 * @property {function} sendFileMessage - Send file/media message
 * @property {function} sendCreatePollMessage - Send poll message
 * @property {function} sendListMessage - Send list message
 * @property {function} openChatFromUnread - Open chat from unread
 * @property {function} openChatBottom - Open chat at bottom
 * @property {function} markIsRead - Mark chat as read
 * @property {function} markIsComposing - Show typing status
 * @property {function} markIsPaused - Stop typing status
 * @property {function} markIsRecording - Show recording status
 * @property {function} pinMsg - Pin message
 * @property {function} unpinMsg - Unpin message
 */
window.FMARK.chat = {
  list: function(options) {
    return window.FMARK.chatList(options);
  },
  sendTextMessage: function(chatId, content, options) {
    return window.FMARK.sendTextMessage(chatId, content, options);
  },
  sendFileMessage: function(chatId, content, options) {
    return window.FMARK.sendFileMessage(chatId, content, options);
  },
  sendCreatePollMessage: function(chatId, pollName, choices, options) {
    return window.FMARK.sendCreatePollMessage(chatId, pollName, choices, options);
  },
  sendListMessage: function(chatId, options) {
    return window.FMARK.sendListMessage(chatId, options);
  },
  openChatFromUnread: function(chatId) {
    return window.FMARK.openChatFromUnread(chatId);
  },
  openChatBottom: function(chatId) {
    return window.FMARK.openChatBottom(chatId);
  },
  markIsRead: function(chatId) {
    return window.FMARK.markIsRead(chatId);
  },
  markIsComposing: function(chatId, duration) {
    return window.FMARK.markIsComposing(chatId, duration);
  },
  markIsPaused: function(chatId) {
    return window.FMARK.markIsPaused(chatId);
  },
  markIsRecording: function(chatId, duration) {
    return window.FMARK.markIsRecording(chatId, duration);
  },
  pinMsg: function(msgId, pin, duration) {
    return window.FMARK.pinMsg(msgId, pin, duration);
  },
  unpinMsg: function(msgId) {
    return window.FMARK.unpinMsg(msgId);
  },
};

/**
 * Group namespace (WPP.group compatible)
 * @namespace FMARK.group
 * @property {function} create - Create a group
 * @property {function} join - Join group via invite link
 * @property {function} addParticipants - Add participants to group
 * @property {function} getParticipants - Get group participants
 * @property {function} canAdd - Check if can add members
 * @property {function} getInviteLink - Get group invite link
 */
window.FMARK.group = {
  create: function(name, participants, options) {
    return window.FMARK.groupCreate(name, participants, options);
  },
  join: function(link) {
    return window.FMARK.joinGroup(link);
  },
  addParticipants: function(groupId, participants) {
    return window.FMARK.groupAddParticipants(groupId, participants);
  },
  getParticipants: function(groupId) {
    return window.FMARK.groupGetParticipants(groupId);
  },
  canAdd: function(groupId) {
    return window.FMARK.groupCanAdd(groupId);
  },
  getInviteLink: function(groupId) {
    return window.FMARK.getGroupInviteLink(groupId);
  },
};
console.log("[FMARK] WPP-compatible namespaces loaded: call, conn, chat, group, labels, contact");

// Documentation: See FMARK_DOCS.md for usage examples