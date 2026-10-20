(function(){
  document.documentElement.classList.add("js");
  var reduce=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
  // system map
  var btns=[].slice.call(document.querySelectorAll(".st"));
  function openNode(id,push){
    btns.forEach(function(b){
      var on=b.getAttribute("data-node")===id;
      b.setAttribute("aria-expanded",on?"true":"false");
      var p=document.getElementById("panel-"+b.getAttribute("data-node"));
      if(p){p.hidden=!on;}
    });
    if(push){try{history.replaceState(null,"","#node-"+id);}catch(e){}}
  }
  btns.forEach(function(b){b.addEventListener("click",function(){
    var id=b.getAttribute("data-node");openNode(id,true);
    if(window.innerWidth<=900){var p=document.getElementById("panel-"+id);if(p){p.scrollIntoView({block:"nearest",behavior:reduce?"auto":"smooth"});}}
  });});
  var m=location.hash.match(/^#node-(\w+)/);
  openNode(m?m[1]:"approval",false);
  // flow maps
  [].slice.call(document.querySelectorAll(".flow")).forEach(function(f){
    var note=f.querySelector(".fnote"),nodes=[].slice.call(f.querySelectorAll(".cn")),cards=[].slice.call(f.querySelectorAll(".mailcard"));
    nodes.forEach(function(n){n.addEventListener("click",function(){
      nodes.forEach(function(x){x.classList.toggle("on",x===n);});
      note.textContent=n.getAttribute("data-note")||"";
      var t=n.getAttribute("data-target");
      cards.forEach(function(c){c.classList.remove("pulse");});
      if(t){var c=f.querySelector("#"+t);if(c){c.classList.add("pulse");
        var rail=c.parentNode;rail.scrollTo({left:c.offsetLeft-rail.offsetLeft-(window.innerWidth<=560?8:0),behavior:reduce?"auto":"smooth"});}}
    });});
  });
  // iframe heights
  [].slice.call(document.querySelectorAll(".flow")).forEach(function(f){
    var frs=[].slice.call(f.querySelectorAll(".dev iframe"));
    function fit(){var mx=0;frs.forEach(function(fr){try{var t=fr.contentDocument.querySelector("table");var h=t?t.offsetHeight:0;if(h>mx){mx=h;}}catch(e){}});
      if(mx>200){frs.forEach(function(fr){fr.style.height=mx+"px";});}}
    frs.forEach(function(fr){fr.addEventListener("load",fit);});
    fit();
  });
  // reveal
  var rv=[].slice.call(document.querySelectorAll(".rv"));
  if(!("IntersectionObserver" in window)||reduce){rv.forEach(function(e){e.classList.add("in");});}
  else{var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target);}});},{rootMargin:"0px 0px -8% 0px"});
    rv.forEach(function(e){io.observe(e);});}
})();
