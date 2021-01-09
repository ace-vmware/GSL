// browserify main.js -o bundle.js

import planer from "planer";
var jsForceConn;
"use strict"

// DOM Content Load
document.addEventListener("DOMContentLoaded", (event) => {

// -------------------------------------ON CONNECT---------------------------------------------
console.log("clientId: ", process.env.GSLClientId)
console.log("redirectUri: ", process.env.GSLRedirectURL)

// jsForce Initialization
jsforce.browser.init({
    clientId: process.env.GSLClientId,
    redirectUri: process.env.GSLRedirectURL,
    //-----------------------------------------------------------------------------//
    // Test Application clientId and redirect above. Uncomment this for dev.
    // GS Lightning clientID and redirectUri below. Uncomment this for production.
    //-----------------------------------------------------------------------------//
    // clientId: "3MVG9oNqAtcJCF.FYrBZD8TqSU_jUMWC1ZROD6vy5I54xwL8SjGYVzM9M6Uhhogxy2cfKL3iCKF51jZKd9efk",
    // redirectUri: "https://gslite.herokuapp.com/",
    //-----------------------------------------------------------------------------//
    proxyUrl: "https://node-salesforce-proxy.herokuapp.com/proxy/"
});

// jsForce Connect
window.jsForce = jsforce.browser.on('connect', function(conn) {
    console.log('Successfully connected to Salesforce');
    jsForceConn = conn;

    loginBtn.addEventListener("click", (event) => {
                
        jsforce.browser.logout();
        location.reload()
    })

    // Find current logged-in user from jsForce session
    let userID = jsForceConn.userInfo.id;
    
    // Query for user's full name.
    jsForceConn
    .query(`SELECT FirstName,LastName FROM User WHERE Id = '${userID}'`)
    .then((result) => {
        
        // Log result.
        let fullName = result.records[0].FirstName + " " + result.records[0].LastName;
        console.log(fullName, " logged in.")

        // Create Headers
        createHeaders()

        // Add dropdownToggle if on Mobile
        dropdownToggle();
        
        // Find user's tickets.
        queryTickets(fullName);
    })
}); 
//--------------------------------End on-connect actions----------------------------------------
// -------------------------------------UTILITIES--------------------------------------------- 

// Handle Bars
let ticketsHtml = document.getElementById("tickets-list").innerHTML;
let detailsHtml = document.getElementById("details-list").innerHTML;
let feedHtml = document.getElementById("email-container").innerHTML;

// Login button
let loginBtn = document.getElementById("login-btn");

function loginEvent() {
    loginBtn.innerHTML = "Logging in... "
    loginBtn.appendChild(spinnerSpan)
    
    jsforce.browser.login();
    
    jsforce.browser.on('connect', function(conn) {
        loginBtn.removeEventListener("click", loginEvent)
        loginBtn.removeChild(spinnerSpan)
        loginBtn.innerHTML = "Logout"
    })
}

function logoutEvent() {
    jsforce.browser.logout();
    console.log("Clicked log out.")
}

while (!jsforce.browser.connection.accessToken) {
    loginBtn.innerHTML = "Login"
    loginBtn.removeEventListener("click", logoutEvent)
    loginBtn.addEventListener("click", loginEvent)
    break;
}
while (jsforce.browser.connection.accessToken) {
    loginBtn.innerHTML = "Logout"
    loginBtn.removeEventListener("click", loginEvent)
    loginBtn.addEventListener("click", logoutEvent)
    break;
}


// Loads first ticket if it exists
function loadFirstTicket() {
    // setTimeout (() => {
        try {
            let firstTicketId = document.getElementById("tickets").childNodes[1].id;
            populateFeed(firstTicketId);
            populateDetails(firstTicketId);
        } catch {
            console.log("Id of first ticket cannot be looked up. Log-in required.")
        }
    // }, 1000)
}

// Clear Screen
function clearHtml() {
    document.getElementById("tickets").innerHTML = "";
    document.getElementById("details").innerHTML = "";
    document.getElementById("feed").innerHTML = "";
}

// Spinner
let spinnerSpan = document.createElement("span");
spinnerSpan.setAttribute("class", "spinner-grow spinner-grow-sm");
spinnerSpan.setAttribute("role", "status");
spinnerSpan.setAttribute("aria-hidden", "true");

let spinner = document.getElementById("spinner")


// Find Tickets Button (and Submit)
window.findTicketsSubmit = () => {
    let TSE = document.getElementById('TSE').value;
    queryTickets(TSE);
}

const findTickets = document
.getElementById("populateCases")
.addEventListener("click", (event) => {
    let TSE = document.getElementById('TSE').value;
    console.log("Getting tickets for: ", TSE);

    queryTickets(TSE);
}) // END Find Tickets Event Listener

// Function to set multiple attributes on an Html element
function setAttributes(el, attrs) {
    for(var key in attrs) {
      el.setAttribute(key, attrs[key]);
    }
  }

// Adds/Removes dropdown-toggle class depending of viewport width
function dropdownToggle() {
    if (window.innerWidth < 600) {
        document.getElementById("case-header").classList.add("dropdown-toggle");
        document.getElementById("feed-header").classList.add("dropdown-toggle");
        document.getElementById("details-header").classList.add("dropdown-toggle");
    }
}

function createHeaders() {
    if (document.getElementById("case-section").children[0].id !== "case-header") {
        
                // Create Case Header and set attributes
                let caseHeader = document.createElement("h2");
        
                setAttributes(caseHeader, {
                    "id": "case-header",
                    "class": "text-white text-center mb-3",
                    "data-toggle": "collapse",
                    "href": "#tickets",
                    "role": "button", 
                    "aria-expanded": "false",
                    "aria-controls": "collapsePanel"
                })
        
                caseHeader.innerHTML = "Cases";
                document.getElementById("case-section")
                .insertBefore(caseHeader, document.getElementById("tickets"))
        
                // Create Feed Header and set attributes
                let feedHeader = document.createElement("h2");
        
                setAttributes(feedHeader, {
                    "id": "feed-header",
                    "class": "text-white text-center mb-3",
                    "data-toggle": "collapse",
                    "href": "#feed",
                    "role": "button", 
                    "aria-expanded": "false",
                    "aria-controls": "collapsePanel"
                })
        
                feedHeader.innerHTML = "Feed";
                document.getElementById("feed-section")
                .insertBefore(feedHeader, document.getElementById("feed"))
        
                // Create Details Header and set attributes
                let detailsHeader = document.createElement("h2");
        
                setAttributes(detailsHeader, {
                    "id": "details-header",
                    "class": "text-white text-center mb-3",
                    "data-toggle": "collapse",
                    "href": "#details",
                    "role": "button", 
                    "aria-expanded": "false",
                    "aria-controls": "collapsePanel"
                })
        
                detailsHeader.innerHTML = "Details";
                document.getElementById("details-section")
                .insertBefore(detailsHeader, document.getElementById("details"))
    }
    else {
        console.log("No headers added because headers already exist.")
    }
}


// -------------------------------------END UTILITIES-------------------------------------------
// -------------------------------------MAIN QUERIES--------------------------------------------

async function queryTickets(TSE) {
    // Find user's tickets.
    jsForceConn.query(
        `SELECT Id, Account.BV_Company_Name__c, CaseNumber, CreatedDate, First_Response_Date__c, Case_Age_Business_Days__c, Case_Age_Days__c, 
        Case_Idle_Time_Days__c, Case_Owner_Name__c, Description, 
        EA_Name__c, GSS_Additional_Emails__c, GSS_Case_Number__c, GSS_Center__c, GSS_Contact_Email__c,
        GSS_Contact_First_Name__c, GSS_Contact_Last_Name__c, GSS_Contact_Phone__c, GSS_Email_From_Address__c, GSS_Environment__c,
        GSS_First_Resp_Met__c, GSS_Last_Touch_Time__c, GSS_Owner_Email__c, GSS_Owner_Manager_Email__c, GSS_Problem_Category__c,
        GSS_Product_Name__c, Idle_time_in_business_days__c, Latest_Inbound_Note__c, Name_of_Entitlement__c, Overall_Resolution_Time__c,
        Priority, Status, Subject, Sub_Status__c, Technical_Contact_Name__c, Account.DNB_Global_Ultimate_Name__c, Account.DNB_HQP_Name__c
        FROM Case 
        WHERE Case_Owner_Name__c = '${TSE}' 
        AND Status != 'Closed' 
        ORDER BY Status ASC NULLS FIRST`,  function(err, res) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log("Query to SFDC resolved.");
                        return res; 
                    }}
        )
        // Send ticket object from SFDC to populateCases() function.
        .then((res) => {
            const ticketObject = res.records;
            populateCases(ticketObject);
            loadFirstTicket();
        });
} // end Query Tickets

async function getDetails(Id) {
    return jsForceConn.sobject("Case")
    .select("Id, Account.BV_Company_Name__c, CaseNumber, CreatedDate, First_Response_Date__c, Case_Age_Business_Days__c, Case_Age_Days__c, Case_Idle_Time_Days__c, Case_Owner_Name__c, Case_Topics__c, Description, EA_Name__c, GSS_Additional_Emails__c, GSS_Case_Number__c, GSS_Center__c, GSS_Contact_Email__c,GSS_Contact_First_Name__c, GSS_Contact_Last_Name__c, GSS_Contact_Phone__c, GSS_Email_From_Address__c, GSS_Environment__c,GSS_First_Resp_Met__c, GSS_Last_Touch_Time__c, GSS_Owner_Email__c, GSS_Owner_Manager_Email__c, GSS_Problem_Category__c,GSS_Product_Name__c, Idle_time_in_business_days__c, Latest_Inbound_Note__c, Name_of_Entitlement__c, Overall_Resolution_Time__c,Priority, Status, Subject, Sub_Status__c, Technical_Contact_Name__c")
    .where(`Id = '${Id}'`, function(err, res) {
        return res ? res : err;
    })
}

async function getFeed(ParentId) {
    return jsForceConn.sobject("EmailMessage")
    .select("FromAddress, FromName, MessageDate, Subject, TextBody, ToAddress")
    .where(`ParentId = '${ParentId}'`)
    .sort("-MessageDate")
}

// -------------------------------------END MAIN QUERIES----------------------------------------
// -------------------------------------MAIN FUNCTIONS------------------------------------------

async function populateCases(ticketObject) {
    // Wipe innerHtml of tickets section
    clearHtml();


    if (!ticketObject) {
        console.log("You must log-in first to populate cases.")
    } else {
    
    console.log("Populating cases...")
    console.log("Get tickets is resolved.\nticketObject = ", ticketObject)
    
    // Iterate through tickets found in getTickets() query. 
    for (let ticket of ticketObject) {
        
        // Get proper account name
        let account = () => {
            try {
                return ticket.Account.BV_Company_Name__c;
            }
            catch {
                return "Account not found."
            }
        }

        // Populate template
        let ticketsHtmlCompile = Handlebars.compile(ticketsHtml);
        let templateContent = ticketsHtmlCompile({
                CaseNumber: ticket.CaseNumber,
                account: account(),
                Id: ticket.Id,
                GSS_Contact_Email__c: ticket.GSS_Contact_Email__c,
                GSS_Contact_First_Name__c: ticket.GSS_Contact_First_Name__c,
                GSS_Contact_Last_Name__c: ticket.GSS_Contact_Last_Name__c,
                GSS_Owner_Email__c: ticket.GSS_Owner_Email__c
            })


        // Create div for template and add conditional logic
        let tempDiv = document.createElement("div")
        tempDiv.innerHTML += templateContent

        // Change color based on status
        if (ticket.Status === "Open") {
            tempDiv
            .childNodes[1]
            .childNodes[1]
            .childNodes[1]
            .childNodes[1]
            .classList.add("light-green")
        } else {
            tempDiv
            .childNodes[1]
            .childNodes[1]
            .childNodes[1]
            .childNodes[1]
            .setAttribute("class", "lavender-blue") 
        }

        // Add div to DOM
        spinnerElem.style.display = "none";
        document.getElementById("tickets").innerHTML += tempDiv.innerHTML;

    } // End iteration through ticket object

    // Add Event Listeners for populateDetails, populateFeed
    let ticketsList = document.getElementById("tickets").children;
    
    for (let i of ticketsList) {

        i.addEventListener("click", (event) => {
            event.preventDefault();

            populateDetails(i.id);
            populateFeed(i.id);
        });
    }
} // END if/else
} // END populateCases()

async function populateDetails(id) {
    let caseDetails = await getDetails(id);
    let details = document.getElementById("details")
    
    // Log and Clear details
    console.log("Case Details Returned: ", caseDetails);
    details.innerHTML = ""

    // Get proper account name
    let account = () => {
        try {
            return caseDetails[0].Account.BV_Company_Name__c;
        }
        catch {
            return "Account name not found."
        }
    }
    
    // TEMPLATE VERSION 
    let detailsHtmlCompile = Handlebars.compile(detailsHtml);
    let templateContent = detailsHtmlCompile(
        {
            Id: caseDetails[0].Id,
            CaseNumber: caseDetails[0].CaseNumber,
            Account: account(),
            First_Response_Date__c: new Date(Date.parse(caseDetails[0].First_Response_Date__c)),
            Case_Age_Business_Days__c: caseDetails[0].Case_Age_Business_Days__c,
            Case_Age_Days__c: caseDetails[0].Case_Age_Days__c,
            Case_Idle_Time_Days__c: caseDetails[0].Case_Idle_Time_Days__c,
            Case_Owner_Name__c: caseDetails[0].Case_Owner_Name__c,
            Description: caseDetails[0].Description,
            EA_Name__c: caseDetails[0].EA_Name__c,
            GSS_Additional_Emails__c: caseDetails[0].GSS_Additional_Emails__c,
            GSS_Case_Number__c: caseDetails[0].GSS_Case_Number__c,
            GSS_Center__c: caseDetails[0].GSS_Center__c,
            GSS_Contact_Email__c: caseDetails[0].GSS_Contact_Email__c,
            GSS_Contact_First_Name__c: caseDetails[0].GSS_Contact_First_Name__c,
            GSS_Contact_Last_Name__c: caseDetails[0].GSS_Contact_Last_Name__c,
            GSS_Contact_Phone__c: caseDetails[0].GSS_Contact_Phone__c,
            GSS_Email_From_Address__c: caseDetails[0].GSS_Email_From_Address__c,
            GSS_Environment__c: caseDetails[0].GSS_Environment__c,
            GSS_First_Resp_Met__c: caseDetails[0].GSS_First_Resp_Met__c,
            GSS_Last_Touch_Time__c: caseDetails[0].GSS_Last_Touch_Time__c,
            GSS_Owner_Email__c: caseDetails[0].GSS_Owner_Email__c,
            GSS_Owner_Manager_Email__c: caseDetails[0].GSS_Owner_Manager_Email__c,
            GSS_Problem_Category__c: caseDetails[0].GSS_Problem_Category__c,
            GSS_Product_Name__c: caseDetails[0].GSS_Product_Name__c,
            Idle_time_in_business_days__c: caseDetails[0].Idle_time_in_business_days__c,
            Latest_Inbound_Note__c: caseDetails[0].Latest_Inbound_Note__c,
            Name_of_Entitlement__c: caseDetails[0].Name_of_Entitlement__c,
            Overall_Resolution_Time__c: caseDetails[0].Overall_Resolution_Time__c,
            Priority: caseDetails[0].Priority,
            Status: caseDetails[0].Status,
            Subject: caseDetails[0].Subject,
            Sub_Status__c: caseDetails[0].Sub_Status__c,
            Technical_Contact_Name__c: caseDetails[0].Technical_Contact_Name__c
        })
    
    details.innerHTML = templateContent;
}

async function populateFeed(n) {
    let selectedParentId  = n;
    let caseFeed = await getFeed(selectedParentId);
    let feed = document.getElementById("feed");
   
    // Log and clear existing feed.
    console.log("Feed returned: ", caseFeed)
    feed.innerHTML = "";

    // Regex for Email parsing
    var REGEX = new RegExp(/((.|\n)*)(?=Global Support Services)/mgi)
    
    for (let feedItem of caseFeed) {
        // Parse Text Body
        let replyText = planer.extractFromPlain(feedItem.TextBody);
        let replyText_parsed = replyText.match(REGEX);

        // Parse Time
        let timestamp = Date.parse(feedItem.MessageDate);
        let parsedMessageDate = new Date(timestamp);
        
        // Build Template
        let feedHtmlCompile = Handlebars.compile(feedHtml);
        let templateContent = feedHtmlCompile({
            MessageDate: parsedMessageDate,
            ToAddress: feedItem.ToAddress,
            FromAddress: feedItem.FromAddress,
            TextBody: replyText.match(REGEX) == null ? replyText : replyText_parsed[0]
        })
        // Add template to Feed
        feed.innerHTML += templateContent;
     }
    }

// -------------------------------------END MAIN FUNCTIONS--------------------------------------
// -------------------------------------EMAIL FUNCTIONALITY-------------------------------------

async function sendEmail(id, caseOwner, casenumber, emailaddress, body) {
    console.log(`sendEmail activated with id: ${id}, casenumber: ${casenumber}, caseowner: ${caseOwner}, emailaddress: ${emailaddress}, and body: ${body}`);
   
   // Construct POST request details
    const accessToken = jsforce.browser.connection.accessToken;
    const sendEmailUri = "https://vmware-gs.my.salesforce.com/services/data/v36.0/actions/standard/emailSimple"
    let reference = `[ ref:_00Df43u6t._${id.slice(0,5)}${id.slice(10, id.length - 3)}:ref ]`
    const dataForCX = {
            "inputs" : [
              {
                "emailBody" : `${body}`,
                "emailAddresses": `${emailaddress}`,
                "emailSubject" : `Workspace ONE - SR ${casenumber} - ${reference}`,
                "senderAddress": "webform@vmware.com",
                "senderType" : "OrgWideEmailAddress"
              }
            ]    
    };

    const dataForSFDC = {
        "inputs" : [
          {
            "emailBody" : `${body}`,
            "emailAddresses": "webform@vmware.com",
            "emailSubject" : `Workspace ONE - SR ${casenumber} - ${reference}`,
            "senderType" : "CurrentUser"
          }
        ]    
    };

    const headers = {
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Content-Type": "application/json;charset=UTF-8",
            "Accept": "*/*",
        }
    };

    // POST Request to Customer and SFDC for simpleEmail API Endpoint
    axios
    .post(sendEmailUri, dataForCX, headers)
    .catch(emailErr => console.log("Could not send e-mail to customer: ", emailErr));

    axios
    .post(sendEmailUri, dataForSFDC, headers)
    .catch(emailErr => console.log("Could not send e-mail to SFDC: ", emailErr));
    
} // END sendEmail()

// emailModal
$('#emailModal').on('show.bs.modal', function (event) {
    let button = $(event.relatedTarget) // Button that triggered the modal
    let contactEmail = button[0].attributes.gss_contact_email__c.value // Extract info from data-* attributes
    let id = button[0].attributes.data.value
    let contactName = `${button[0].attributes.GSS_Contact_First_Name__c.value} ${button[0].attributes.GSS_Contact_Last_Name__c.value}`
    let CaseNumber = button[0].attributes.casenumber.value
    let caseOwner = button[0].attributes.GSS_Owner_Email__c.value

    // Update the modal's content. 
    let modal = $(this)
    
    modal.find('.modal-title')
    .text('New message to ' + contactName);

    modal.find('.modal-body input')
    .val(contactEmail);

    // Fill in arguments for sendEmail()
    modal.find('#sendEmailbtn')
    .click((event) => {

        // Parse message text and sendEmail()
        let messageText = modal.find("#message-text")[0].value
        sendEmail(id, caseOwner, CaseNumber, contactEmail, messageText); 
    })
}) // END emailModal

// -------------------------------------Download Functionality-----------------------------------

// Download Queries
async function queryContentDocumentIdLinks(Id) {

    return jsForceConn
            .query(
                `SELECT ContentDocumentId 
                FROM ContentDocumentLink 
                WHERE LinkedEntityId = '${Id}'
                ORDER BY SystemModstamp DESC NULLS FIRST`, 
                function(err, res) {
                    return res ? res.records : err;
                })
}

async function queryContentDocumentObj(ContentDocumentId) { 
    return jsForceConn.query(
                `SELECT ContentSize,CreatedDate,FileExtension,LatestPublishedVersionId,Title 
                FROM ContentDocument 
                WHERE Id = '${ContentDocumentId}'`)
            }

// Download Funcs
async function getLastPublishedVersionIds(downloadLinks) {
    
    const contentDocumentObject = [];

    for (let object of downloadLinks) {

        let res = await queryContentDocumentObj(object.ContentDocumentId)
        // contentDocumentObject[res.records[0].LatestPublishedVersionId] = res.records[0];
        contentDocumentObject.push(res.records[0])
    }

    return contentDocumentObject;
}

// downloadModal
$('#downloadModal').on('show.bs.modal', async function (event) {
    let button = $(event.relatedTarget) // Button that triggered the modal
    let Id = button[0].attributes[4].value

    let ContentDocumentIdArray = await queryContentDocumentIdLinks(Id);
    let ContentDocumentObj = await getLastPublishedVersionIds(ContentDocumentIdArray);

    let modalBody = document.getElementById("download-list-form")
    let downloadList = document.getElementById("download-list").innerHTML;
    let downloadListFunc = Handlebars.compile(downloadList);

    spinner.style.display = "none"

    for (let object of ContentDocumentObj) {

        let timestamp = Date.parse(object.CreatedDate);
        let parsedTimestamp = new Date(timestamp);

        modalBody.innerHTML += downloadListFunc({
            Title: object.Title.slice(0, 30),
            CreatedDate: String(parsedTimestamp).slice(0, -32),
            LatestPublishedVersionId: object.LatestPublishedVersionId
        })
    }

}) // END downloadModal

// Resets data after downloadModal has been dismissed.
$("#downloadModal").on("hidden.bs.modal", function(){
    
    spinner.style.display = "block";
    document.getElementById("download-list-form").innerHTML = "";

});

// downloadModal Submit Actions
document.getElementById("download-list-form").onsubmit = (event) => {
    event.preventDefault();

    // Parse submit action
    const checkBoxes = event.target;

    // For each target of the action...
    for (let box of checkBoxes) {
        
        box.checked ? download(box.value) : {};
    }
}

// Function to handle downloads in submit action
function download(LatestPublishedVersionId) {

    const url = `https://vmware-gs.lightning.force.com/sfc/servlet.shepherd/version/download/${LatestPublishedVersionId}`;
    const element = document.createElement('a');
    
    element.href = url;
    element.setAttribute('download', LatestPublishedVersionId);
    element.setAttribute('id', LatestPublishedVersionId)
    element.style.display = 'none';

    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    

  }
// -------------------------------------END Download Functionality-----------------------------------
// -------------------------------------END DOMContentLoaded-------------------------------------
})