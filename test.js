import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const config = window.EVENTORA_SUPABASE || {};
const $ = (s) => document.querySelector(s);
const form = $("#testRegisterForm");
let client = null, currentReference = null;
function message(el, text, error=false) { el.hidden=false; el.textContent=text; el.style.color=error?"#a53c35":"#17583d"; }
function setup() {
  if (!config.url || !config.publishableKey) {
    message($("#registrationResult"),"Test service is not configured.",true); return;
  }
  client = createClient(config.url,config.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});
  $("#testDivision").addEventListener("change",()=>{
    const ap=document.querySelector('input[value="AP Debate"]');
    ap.disabled=$("#testDivision").value!=="C";
    if(ap.disabled) ap.checked=false;
  });
  form.addEventListener("submit",async e=>{
    e.preventDefault();
    const segments=[...document.querySelectorAll('input[name="testSegments"]:checked')].map(x=>x.value);
    if(!segments.length){message($("#registrationResult"),"Select at least one segment.",true);return;}
    const button=$("#createTest");button.disabled=true;
    try{
      const {data,error}=await client.rpc("eventora_public_test_register",{p_division:$("#testDivision").value,p_segments:segments});
      if(error)throw error;
      currentReference=data.reference;
      $("#testPaymentPanel").hidden=false;
      message($("#registrationResult"),"TEST registration created. Reference: "+data.reference+" · Demonstration amount: ৳"+data.test_amount+" · TEST only.");
      $("#testTransaction").value="";
      $("#testPaymentPanel").scrollIntoView({behavior:"smooth",block:"start"});
    }catch(err){message($("#registrationResult"),err.message||"Could not create test registration.",true);}
    finally{button.disabled=false;}
  });
  $("#testPaymentForm").addEventListener("submit",async e=>{
    e.preventDefault();
    if(!currentReference){message($("#paymentResult"),"Create a TEST registration first.",true);return;}
    const button=e.submitter;button.disabled=true;
    try{
      const {data,error}=await client.rpc("eventora_public_test_payment",{
        p_reference:currentReference,
        p_payment_method:$("#testPaymentMethod").value,
        p_transaction_reference:$("#testTransaction").value.trim().toUpperCase()
      });
      if(error)throw error;
      message($("#paymentResult"),"TEST payment submitted successfully. Reference: "+currentReference+". An authorised organizer can now review it.");
    }catch(err){message($("#paymentResult"),err.message||"Could not submit test payment.",true);}
    finally{button.disabled=false;}
  });
}
setup();