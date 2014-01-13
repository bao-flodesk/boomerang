<?php
$filename = $argv[1];
$version = $argv[2];
$file = file_get_contents($filename);

$data = json_decode($file, true);

$references = $data["references"];

$newreferences = array();

$boomerang_reference = array(
	"name" => "boomerang-$version",
	"type" => "boomerang",
	"internalID" => "rsdbref"
);

$set = false;
if($references) {
	foreach($references as &$reference) {
		if($reference["type"] === "boomerang") {
			$set = true;
			$reference = $boomerang_reference;
		}
		else {
			$newreferences[] = $reference;
		}
	}
}

if(!$set) {
	$references[] = $boomerang_reference;
}

if($version === "remove") {
	print json_encode(array("references" => $newreferences));
}
else {
	print json_encode(array("references" => $references));
}
?>