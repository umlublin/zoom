#include <stdio.h>
#include <stdlib.h>
#include <sys/stat.h>
#include <jpeglib.h>
#include <unistd.h>
#include <math.h>
#include <string.h>

int directory_exists(const char *path) {
    struct stat st;
    return stat(path, &st) == 0 && S_ISDIR(st.st_mode);
}

int file_exists(const char *path) {
    return access(path, F_OK) == 0;
}

int create_directory(const char *path) {
    //printf("create: '%s' \n",path);
    return mkdir(path, 0755);
}



void write_tile_raw(char* filename, JSAMPROW *buffer, int xsize, int ysize, int components) {

  struct jpeg_compress_struct cinfo;
  struct jpeg_error_mgr jerr;

  FILE * outfile;
  int row_stride;

  cinfo.err = jpeg_std_error(&jerr);

  jpeg_create_compress(&cinfo);

  if ((outfile = fopen(filename, "wb")) == NULL) {
    fprintf(stderr, "Can't open '%s' for write\n", filename);
    exit(1);
  }
  jpeg_stdio_dest(&cinfo, outfile);

  cinfo.image_width = xsize;
  cinfo.image_height = ysize;
  if (components==3) {
   cinfo.input_components = 3;
   cinfo.in_color_space = JCS_RGB;
  } else {
   cinfo.input_components = 1;
   cinfo.in_color_space = JCS_GRAYSCALE;
  }
  jpeg_set_defaults(&cinfo);
  jpeg_set_quality(&cinfo, 90, TRUE);
  jpeg_start_compress(&cinfo, TRUE);

  int row=0;
  while (cinfo.next_scanline < cinfo.image_height ) {
    (void) jpeg_write_scanlines(&cinfo, &buffer[row], 1);
    row++;
  }

  jpeg_finish_compress(&cinfo);
  fclose(outfile);
  jpeg_destroy_compress(&cinfo);
}

void write_tile(char* filename, JSAMPROW *buffer, int components) {
  write_tile_raw(filename, buffer, 255, 255, components);
}

int read_tile(char* filename, JSAMPROW *buffer) {

  struct jpeg_decompress_struct cinfo;
  struct jpeg_error_mgr jerr;

  cinfo.err = jpeg_std_error(&jerr);
  jpeg_create_decompress(&cinfo);

  FILE* infile = fopen(filename, "rb");
  if (!infile) {
//        fprintf(stderr, "Nie można otworzyć pliku %s\n", filename);
        return 0;
  }

  jpeg_stdio_src(&cinfo, infile);
  jpeg_read_header(&cinfo, TRUE);
  jpeg_start_decompress(&cinfo);

  if (cinfo.image_width>256 || cinfo.image_width>256) {
    fprintf(stderr, "Invalid tile file %s\n", filename);
    return 0;
  }

  int row=0;
  while (cinfo.output_scanline < cinfo.output_height) {
    (void) jpeg_read_scanlines(&cinfo, &buffer[row], 1);
    row++;
  }

  jpeg_finish_decompress(&cinfo);
  jpeg_destroy_decompress(&cinfo);
  fclose(infile);
  return 1;
}



void flush(char* root, int y, int ylines, int xmax, JSAMPROW* input_rows, int components) {

  static unsigned char black[256*3] = {0};
  unsigned char* output_rows[256];
  for (int x=0; x<xmax; x++ ) {
    for (int i =0; i<=255; i++) {
       if (i<=ylines-1) {
       output_rows[i] = &input_rows[i][256*x*components];
       } else {
       output_rows[i] = black;
       }
    }
  char dir[100];
  snprintf(dir, 100, "%s/%d", root, x);
  if (!directory_exists(dir)) {
      create_directory(dir);
  }
  char filename[100];
  snprintf(filename, 100, "%s/%d/%d.jpg", root, x, y);
  if (file_exists(filename)) {
    //printf("%s skipped", filename);
    continue;
  }
//  printf("%s\n",filename);
  write_tile(filename, output_rows, components);
  }

}

JSAMPROW * allocate_buffer(int x_size/*256*/, int y_size/*256*/, int components /*3*/) {
  int rows_buffer = y_size* sizeof(unsigned char *);
  JSAMPROW* data = (unsigned char **)malloc(rows_buffer);
  for (int i =0; i<=y_size; i++) {
   data[i] = malloc(x_size*components);
  }
//  printf("buffers %d\n", y_size*x_size*3 + rows_buffer);
  return data;
}

void free_buffer(JSAMPROW * data, int y_size/*256*/) {
  for (int i =0; i<=y_size; i++) {
   free(data[i]);
  }
  free(data);
}

void fill_black_raw(JSAMPROW * output, int components, int xmax, int ymax, int xoff, int yoff) {
  for (int y =0; y<=xmax; y++) {
     memset(output[yoff+y]+xoff, 0, ymax*components);
//    for(int x=0; x<=ymax*components; x++) {
//     output[yoff+y][xoff+x]=0;
//    } 
  }
}

void fill_black(JSAMPROW * output, int components, int xoff, int yoff) {
  fill_black_raw(output, components, 128, 128, xoff, yoff);
}

void fill_black_255(JSAMPROW * output, int components, int xoff, int yoff) {
  fill_black_raw(output, components, 255, 255, xoff, yoff);
}


void resize_tile(JSAMPROW * input, JSAMPROW * output, int components, int xoff, int yoff) {
  xoff*=components;
  for (int y =0; y<=255; y=y+2) {
    if (components==3) {
    for(int x=0; x<=255*components; x+=6) {
     output[yoff+y/2][xoff+x/2]=input[y][x];
     output[yoff+y/2][xoff+x/2+1]=input[y][x+1];
     output[yoff+y/2][xoff+x/2+2]=input[y][x+2];
    }
    } else {
    for(int x=0; x<=255; x=x+2) {
     output[yoff+y/2][xoff+x/2]=input[y][x];
    }
    } 
  }
}

void fit_tile(JSAMPROW * input, JSAMPROW * output, int components, int xoff, int yoff) {
  for (int y =0; y<=255; y++) {
     memcpy(output[y+yoff]+xoff*components, input[y], 255*components);
  }
}

void make_preview(char * in_path, char * out_path, int x, int y, int components) {
 JSAMPROW* input = allocate_buffer(256, 256, components);
 JSAMPROW* output = allocate_buffer(512, 512, components);
  int tx=0;
  int ty=0;

  char filename[100];
  snprintf(filename, 100, "%s/%d/%d.jpg", in_path, tx, ty);
  if (read_tile(filename, input)) {
    fit_tile(input, output, components, 0, 0);
  } else {
    fill_black_255(output, components, 0, 0);
  }
  snprintf(filename, 100, "%s/%d/%d.jpg", in_path, tx+1, ty);
  if (read_tile(filename, input)) {
    fit_tile(input, output, components, 255, 0);
  } else {
    fill_black_255(output, components, 255, 0);
  }
  snprintf(filename, 100, "%s/%d/%d.jpg", in_path, tx, ty+1);
  if (read_tile(filename, input)) {
    fit_tile(input, output, components, 0, 255);
  } else {
    fill_black_255(output, components, 0, 255);
  }
  snprintf(filename, 100, "%s/%d/%d.jpg", in_path, tx+1, ty+1);
  if (read_tile(filename, input)) {
    fit_tile(input, output, components, 255,255);
  } else {
    fill_black_255(output, components, 255, 255);
  }

  snprintf(filename, 100, "%s/preview.jpg", out_path);
//TODO obcięcie
  write_tile_raw(filename, output, x, y, components); 

  free_buffer(output, 512);
  free_buffer(input, 256);
}


void resize_half(char * in_path, char * out_path, int tx, int ty, int components) {

  JSAMPROW* input = allocate_buffer(256, 256, components);
  JSAMPROW* output = allocate_buffer(256, 256, components);
  char filename[100];
  snprintf(filename, 100, "%s/%d/%d.jpg", in_path, tx, ty);
//  printf("read %s %d\n", filename, components);
  if (read_tile(filename, input)) {
    resize_tile(input, output, components, 0, 0);
  } else {
    fill_black(output, components, 0, 0);
  }
  snprintf(filename, 100, "%s/%d/%d.jpg", in_path, tx+1, ty);
  if (read_tile(filename, input)) {
    resize_tile(input, output, components, 128, 0);
  } else {
    fill_black(output, components, 128, 0);
  }
  snprintf(filename, 100, "%s/%d/%d.jpg", in_path, tx, ty+1);
  if (read_tile(filename, input)) {
    resize_tile(input, output, components, 0, 128);
  } else {
    fill_black(output, components, 0, 128);
  }
  snprintf(filename, 100, "%s/%d/%d.jpg", in_path, tx+1, ty+1);
  if (read_tile(filename, input)) {
    resize_tile(input, output, components, 128, 128);
  } else {
    fill_black(output, components, 128, 128);
  }

  char dir[100];
  snprintf(dir, 100, "%s/%d", out_path, tx/2);
  if (!directory_exists(dir)) {
      create_directory(dir);
  }

  snprintf(filename, 100, "%s/%d/%d.jpg", out_path, tx/2, ty/2);
  write_tile(filename, output, components); 
  free_buffer(output, 256);
  free_buffer(input, 256);
}

int get_max(int a, int b) {
  return (a>b)?a:b;
}

int main(int argc, char *argv[]) {
    if (argc<2) {
     printf("make_tiles filename.jpg destination_directory\n");
     return(1);
    }
    const char* filename = argv[1];
    char* root = argv[2];
    if (!directory_exists(root)) {
      create_directory(root);
    }
    printf("Using destination directory: %s\n", root);

    // Otwieranie pliku
    FILE* infile = fopen(filename, "rb");
    if (!infile) {
        fprintf(stderr, "Can't open file '%s'\n", filename);
        return 1;
    }

    struct jpeg_decompress_struct cinfo;
    struct jpeg_error_mgr jerr;

    cinfo.err = jpeg_std_error(&jerr);
    jpeg_create_decompress(&cinfo);
    jpeg_stdio_src(&cinfo, infile);
    jpeg_read_header(&cinfo, TRUE);
    jpeg_start_decompress(&cinfo);

    printf("Rozmiar obrazu: %d x %d\n", cinfo.output_width, cinfo.output_height);
    int max= get_max(cinfo.output_width, cinfo.output_height);
    int zoom = ceil(log2((float)max/256));
    printf("Max zoom: %d %f\n", zoom, log2((float)max/256));
    printf("Liczba składowych: %d\n", cinfo.output_components);

    JSAMPROW * buffer = allocate_buffer(cinfo.output_width+256, 256, cinfo.output_components);
    char * roots[zoom+1];

    for(int zl=zoom; zl>=0; zl--) {
      roots[zl]=(char *)malloc(100*sizeof(char));
      snprintf(roots[zl], 100, "%s/%d", root, zl);
//      printf("root %d '%s'\n",zl, roots[zl]);
      create_directory(roots[zl]);
    }
    //return 0;


    int y_row = 0;
    int xmax = (cinfo.output_width+255)/256;

    while (cinfo.output_scanline < cinfo.output_height) {
        jpeg_read_scanlines(&cinfo, &buffer[y_row%256], 1);
        //printf("wiersz: %d, %d\n", cinfo.output_scanline, y_row%256);

        y_row++;
        if (y_row%256==0) {
           flush(roots[zoom], (y_row-1)/256, 256, xmax, buffer, cinfo.output_components);
       }
    }
    //printf("last flush\n");
    flush(roots[zoom], (y_row-1)/256, y_row%256, xmax, buffer, cinfo.output_components);

    free_buffer(buffer, 256);

    jpeg_finish_decompress(&cinfo);
    jpeg_destroy_decompress(&cinfo);
    fclose(infile);

    int x_tiles=ceil((cinfo.output_width+255)/256);
    int y_tiles=ceil((cinfo.output_height+255)/256);
    int x_size=cinfo.output_width;
    int y_size=cinfo.output_height;
    for (int zl=zoom; zl>=1; zl--) {
     printf("Zoom %d Size(%d*%d) Tiles(%d*%d)\n",zl, x_size, y_size, x_tiles, y_tiles);
     for (int x=0; x<=x_tiles; x+=2) {
       for (int y=0; y<=y_tiles; y+=2) {
        //printf("%s->%s %d-%d\n", roots[zl],roots[zl-1], x,y);
        resize_half(roots[zl],roots[zl-1], x, y, cinfo.output_components);
       }
     }
     if (zl==1) {
       make_preview(roots[zl], root, x_size, y_size, cinfo.output_components);
     }
     x_tiles=x_tiles>1?ceil((float)(x_tiles)/2):1;
     y_tiles=y_tiles>1?ceil((float)(y_tiles)/2):1;
     x_size/=2;
     y_size/=2;
    }
    FILE *f;
    char config[100];
    snprintf(config, 100, "%s/config.json", root);
    f = fopen(config, "a");
    fprintf(f, "{\"width\": %d,\"height\": %d, \"max_zoom\": %d, \"tile_size\": 256}", cinfo.output_width, cinfo.output_height, zoom);
    fclose(f);
    return 0;
}