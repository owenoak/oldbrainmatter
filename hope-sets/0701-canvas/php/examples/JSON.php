require_once ('php/lib/JSON/JSON.php');
$filejson= "foo";
$json = new Services_JSON();
$files = $json->decode($filejson);
$count = count($files);
