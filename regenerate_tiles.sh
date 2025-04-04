root="./tiles"
for dir in $(ls -x $root)
do
  echo "Processing $dir"
  ./make_tiles $root/$dir/full.jpg $root/$dir
done