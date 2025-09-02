"use client"

import { Button, Input, Slider, Typography } from '@material-tailwind/react';
import { ToyEditor } from 'cone-editor';
import { useRef, useState } from 'react';
import { HexColorPicker } from "react-colorful";

export default function Home() {
  const [style, setStyle] = useState({
    borderWidth: 2,
    borderColor: "#000",
    color: "lightblue",
  })
  const ref = useRef(null)
  const [ toy, setToy] = useState({})
  const [ width, setWidth] = useState(100)
  const [ copyStatus, setCopyStatus ] = useState(0)
  const maxWidth = 200;
  const minWidth = 5;
  const maxBorder = 10;
  const minBorder = 0;
  const setStyleColor = ((color: string) => setStyle({ ...style, ...{ color: color } }));
  const setStyleBorderColor = ((color: string) => setStyle({ ...style, ...{ borderColor: color } }));
  const setStyleBorderWidth = ((width: number) => setStyle({ ...style, ...{ borderWidth: width } }));

    const handleCopyClick = async () => {
    try {
      await navigator.clipboard.writeText(ref?.current ? ref.current.outerHTML : "");
      setCopyStatus(1);
      setTimeout(() => setCopyStatus(0), 2000);
    } catch (err) {
      setCopyStatus(-1);
    }
  };
  const getButtonColor = () => {
    return copyStatus===0? "black" : copyStatus===-1? "red": "green"
  }

  const getButtonText = () => {
    return copyStatus===0? "Copy SVG" : copyStatus===-1? "Faild": "Copied"
  }

  return (
    <>
      <div className="items-center justify-items-center min-h-screen p-8 flex-col">
        <div className="flex flex-wrap gap-4">
          <div className='flex-none smallPicker'>
            <Typography>Toy color</Typography>
            <HexColorPicker color={style.color} onChange={setStyleColor} />
            <div className='mt-2'>
            <Input value={style.color} onChange={(e) => setStyleColor(e.target.value)}></Input>
            </div>
          </div>
          <div className='flex-none smallPicker'>
            <Typography>Border color</Typography>
            <HexColorPicker color={style.borderColor} onChange={setStyleBorderColor} />
            <div className='mt-2'>
            <Input value={style.borderColor} onChange={(e) => setStyleBorderColor(e.target.value)}></Input>
            </div>
          </div>
          <div className='flex-1'>
            <Typography>SVG width: {Math.round(width)} px</Typography>
            <Slider
              value={(width - minWidth) / ((maxWidth - minWidth) / 100)}
              onChange={(e) => setWidth(((maxWidth - minWidth) / 100) * Number(e.target.value) + minWidth)}
            />
            <Typography className='mt-3'>SVG Stroke Width: {Math.round(style.borderWidth)} px</Typography>
            <Slider
              value={(style.borderWidth - minBorder) / ((maxBorder - minBorder) / 100)}
              onChange={(e) => setStyleBorderWidth(((maxBorder - minBorder) / 100) * Number(e.target.value) + minBorder)}
            />
          </div>
          <div className='flex-1'> <Button color={ getButtonColor() } onClick={handleCopyClick}>{getButtonText()}</Button></div>
                 
        </div>
        <div className="flex flex- justify-center">
          <ToyEditor style={style} width={width} onChange={setToy} ref={ref}/>
        </div>
      </div>
    </>
  );
}
