(window.webpackJsonp=window.webpackJsonp||[]).push([[1],{45:function(e,t,i){"use strict";Object.defineProperty(t,"__esModule",{value:!0});var o=document.body,n=o.querySelector("#sidebar"),r=o.querySelector("#sidebar-toggler"),s=o.querySelector(".sidebar-overlay"),d=o.querySelector("#sidebar-menu"),c=r.cloneNode(!0);c.setAttribute("id","#sidebar-collapse");var l=function(e,t){e.forEach(function(e){return e.setAttribute("aria-expanded",t)})},u=function(){n.classList.remove("toggled"),l([n,r,c],!1)},a=function(){n.classList.add("toggled"),l([n,r,c],!0),n.focus()},b=void 0,f=void 0,v=void 0,p=void 0,w=0,y=!1,g=!1,h=0,A=void 0,L=void 0,m=function(){p=window.scrollY,f=o.offsetHeight,v=n.offsetHeight,A=Math.round(p+n.getBoundingClientRect().top),v>b?p>w?y?(y=!1,h=A>0?A:0,n.setAttribute("style","top: "+h+"px;")):!g&&p+b>v+A&&v<f&&(g=!0,n.setAttribute("style","position: fixed; bottom: 0;")):p<w?g?(g=!1,h=A>0?A:0,n.setAttribute("style","top: "+h+"px;")):!y&&p<A&&(y=!0,n.setAttribute("style","position: fixed;")):(y=g=!1,h=A||0,n.setAttribute("style","top: "+h+"px;")):y||(y=!0,n.setAttribute("style","position: fixed;")),w=p},x=function(){window.innerWidth,b=window.innerHeight,m()};t.initSidebar=function(){n.setAttribute("tabindex","-1"),n.insertBefore(c,n.children[1]),l([n,r,c],!1),r.addEventListener("click",a),c.addEventListener("click",u),s.addEventListener("click",u),window.addEventListener("scroll",m),window.addEventListener("resize",function(){clearTimeout(L),L=setTimeout(x,500)}),x(),d&&d.querySelectorAll(".item.has-children").forEach(function(e){var t=e.querySelector("button"),i=e.querySelector(".sub-menu");l([i,t],!1),t.addEventListener("click",function(){var o=e.classList.contains("toggled");e.classList[o?"remove":"add"]("toggled"),l([i,t],!o)})})}}}]);
