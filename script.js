function addTask(){

let task =
document.getElementById("task").value;

let deadline =
document.getElementById("deadline").value;

let priority =
document.getElementById("priority").value;

let div =
document.createElement("div");

div.className="task";

div.innerHTML=
`
<h3>${task}</h3>
<p>${deadline}</p>
<p>${priority}</p>
`;

document.getElementById("taskList")
.appendChild(div);

}

function getSuggestion(){

alert(
"AI Suggestion:\nComplete High Priority Tasks First"
);

}