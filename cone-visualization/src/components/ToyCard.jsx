import { deleteToy } from "../services/api";
import ToyRender from "./ToyRender"
import {
    Card,
    CardHeader,
    CardBody,
    Menu,
    MenuHandler,
    MenuList,
    MenuItem,
    Typography,
    IconButton,
} from "@material-tailwind/react";


const ToyCard = ({ toy, scaleFactor, updateLastChanged }) => {

    const deleteToyAndUpdate = async (id) => {
      try {
        await deleteToy(id);
      } finally {
        updateLastChanged();
      }
    };

    return (
        <Card className="w-96 shadow-lg group" >
            <Menu>
                <MenuHandler>
                    <IconButton className="child hidden group-hover:block !absolute top-5 right-5 z-10" color="white" variant="filled">...</IconButton>
                </MenuHandler>
                <MenuList>
                    <MenuItem><Typography onClick={() => deleteToyAndUpdate(toy.id)} color="red" variant="small">Delete</Typography></MenuItem>
                </MenuList>
            </Menu>
            <CardHeader shadow={false} floated={false} className="h-[320px]">

                <div className="h-full w-full flex items-end bg-gradient-to-br from-red-50/40 to-teal-100/40">
                    <ToyRender topShape={toy.topShape} sections={toy.sections} scaleFactor={scaleFactor} />
                </div>

            </CardHeader>
            <CardBody>
                <div className="mb-2 flex items-center justify-between">
                    <Typography color="blue-gray" className="font-medium">
                        {toy.brand} {toy.name}
                    </Typography>
                    <Typography color="blue-gray" className="font-medium">
                        {toy.size}
                    </Typography>
                </div>
                <Typography
                    variant="small"
                    color="gray"
                    className="flex items-center font-normal opacity-75"
                >
                    <svg className="mr-2" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 1024 1024"><path fill="currentColor" d="M840 836H184c-4.4 0-8 3.6-8 8v60c0 4.4 3.6 8 8 8h656c4.4 0 8-3.6 8-8v-60c0-4.4-3.6-8-8-8zm0-724H184c-4.4 0-8 3.6-8 8v60c0 4.4 3.6 8 8 8h656c4.4 0 8-3.6 8-8v-60c0-4.4-3.6-8-8-8zM610.8 378c6 0 9.4-7 5.7-11.7L515.7 238.7a7.14 7.14 0 0 0-11.3 0L403.6 366.3a7.23 7.23 0 0 0 5.7 11.7H476v268h-62.8c-6 0-9.4 7-5.7 11.7l100.8 127.5c2.9 3.7 8.5 3.7 11.3 0l100.8-127.5c3.7-4.7.4-11.7-5.7-11.7H548V378h62.8z" /></svg>
                    {toy.height} mm
                </Typography>
                <Typography
                    variant="small"
                    color="gray"
                    className="flex items-center font-normal opacity-75"
                >
                    <svg className="mr-2" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                        <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10s-4.477 10-10 10Zm7-10l-3-3m3 3l-3 3m3-3H5m0 0l3-3m-3 3l3 3" />
                    </svg>
                    {toy.diameter} mm
                </Typography>
            </CardBody>
        </Card>
    )
}


export default ToyCard