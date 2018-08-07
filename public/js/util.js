function GetStoredLayoutList(){
  list = [];
  for (var key in localStorage){
    if(key.search('LAYOUT_')!=-1){
      list.push(key)
    }
  }
  return list;
}
